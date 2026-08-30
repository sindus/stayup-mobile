import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  readToken,
  writeToken,
  clearToken,
  readApiUrl,
  writeApiUrl,
  resetApiUrl,
  readInstances,
  addInstance,
  removeInstance,
  renameInstance,
  setPrimaryInstance,
  updateInstanceToken,
  upsertPrimaryInstance,
  hostOf,
  readLang,
  writeLang,
  readReadItems,
  writeReadItems,
  DEFAULT_API_URL,
} from "../src/lib/store"

const secure = SecureStore as unknown as {
  getItemAsync: jest.Mock
  setItemAsync: jest.Mock
  deleteItemAsync: jest.Mock
}
const async = AsyncStorage as unknown as {
  getItem: jest.Mock
  setItem: jest.Mock
  removeItem: jest.Mock
}

/** In-memory backing so multi-step store ops (read then write) behave. */
function stage(initial: { async?: Record<string, string>; secure?: Record<string, string> } = {}) {
  const a: Record<string, string> = { ...initial.async }
  const s: Record<string, string> = { ...initial.secure }
  async.getItem.mockImplementation((k: string) => Promise.resolve(a[k] ?? null))
  async.setItem.mockImplementation((k: string, v: string) => {
    a[k] = v
    return Promise.resolve()
  })
  async.removeItem.mockImplementation((k: string) => {
    delete a[k]
    return Promise.resolve()
  })
  secure.getItemAsync.mockImplementation((k: string) => Promise.resolve(s[k] ?? null))
  secure.setItemAsync.mockImplementation((k: string, v: string) => {
    s[k] = v
    return Promise.resolve()
  })
  secure.deleteItemAsync.mockImplementation((k: string) => {
    delete s[k]
    return Promise.resolve()
  })
  return { a, s }
}

const META = (list: { id: string; url: string; name: string }[]) => ({
  instances: JSON.stringify(list),
})

afterEach(() => jest.clearAllMocks())

describe("instances", () => {
  it("hydrates each instance with its token from the secure store", async () => {
    stage({
      async: META([{ id: "i1", url: "https://a.dev", name: "A" }]),
      secure: { tok_i1: "jwt-a" },
    })
    await expect(readInstances()).resolves.toEqual([
      { id: "i1", url: "https://a.dev", name: "A", token: "jwt-a" },
    ])
  })

  it("returns an empty list with no meta and no legacy session", async () => {
    stage()
    await expect(readInstances()).resolves.toEqual([])
  })

  it("migrates a legacy auth_token + api_url into a primary instance", async () => {
    const { a, s } = stage({
      secure: { auth_token: "legacy" },
      async: { api_url: "https://legacy.dev" },
    })
    const list = await readInstances()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      url: "https://legacy.dev",
      name: "legacy.dev",
      token: "legacy",
    })
    expect(s.auth_token).toBeUndefined()
    expect(a.api_url).toBeUndefined()
    expect(s[`tok_${list[0].id}`]).toBe("legacy")
  })

  it("migrates with the default URL when only a legacy token exists", async () => {
    stage({ secure: { auth_token: "legacy" } })
    const list = await readInstances()
    expect(list[0].url).toBe(DEFAULT_API_URL)
  })

  it("appends, renames, promotes, retokenizes and removes", async () => {
    stage({
      async: META([{ id: "i1", url: "https://a.dev", name: "A" }]),
      secure: { tok_i1: "ta" },
    })

    await addInstance({ url: "https://b.dev", name: "B", token: "tb" })
    let list = await readInstances()
    expect(list.map((i) => i.name)).toEqual(["A", "B"])

    const bId = list[1].id
    await renameInstance(bId, "Beta")
    await setPrimaryInstance(bId)
    list = await readInstances()
    expect(list[0].name).toBe("Beta")

    await updateInstanceToken(bId, "tb2")
    list = await readInstances()
    expect(list[0].token).toBe("tb2")

    await removeInstance(bId)
    list = await readInstances()
    expect(list.map((i) => i.name)).toEqual(["A"])
  })

  it("ignores setPrimary / rename for an unknown id", async () => {
    stage({
      async: META([{ id: "i1", url: "https://a.dev", name: "A" }]),
      secure: { tok_i1: "ta" },
    })
    await setPrimaryInstance("nope")
    await renameInstance("nope", "x")
    const list = await readInstances()
    expect(list).toEqual([{ id: "i1", url: "https://a.dev", name: "A", token: "ta" }])
  })
})

describe("upsertPrimaryInstance", () => {
  it("creates a primary named after the host", async () => {
    stage()
    const inst = await upsertPrimaryInstance({ url: "https://c.dev", token: "tc" })
    expect(inst).toMatchObject({ url: "https://c.dev", name: "c.dev", token: "tc" })
  })

  it("keeps the existing id and honours an explicit name", async () => {
    stage({
      async: META([{ id: "i1", url: "https://a.dev", name: "A" }]),
      secure: { tok_i1: "ta" },
    })
    const inst = await upsertPrimaryInstance({ url: "https://a.dev", token: "ta2", name: "Home" })
    expect(inst).toEqual({ id: "i1", url: "https://a.dev", name: "Home", token: "ta2" })
  })
})

describe("hostOf", () => {
  it("returns the host, or the input when it is not a URL", () => {
    expect(hostOf("https://api.example.com:8080/x")).toBe("api.example.com:8080")
    expect(hostOf("not a url")).toBe("not a url")
  })
})

describe("primary-instance compat shims", () => {
  it("reads and writes the primary token", async () => {
    stage({
      async: META([{ id: "i1", url: "https://a.dev", name: "A" }]),
      secure: { tok_i1: "ta" },
    })
    await expect(readToken()).resolves.toBe("ta")
    await writeToken("tnew")
    await expect(readToken()).resolves.toBe("tnew")
  })

  it("returns null / default when there is no instance", async () => {
    stage()
    await expect(readToken()).resolves.toBeNull()
    await expect(readApiUrl()).resolves.toBe(DEFAULT_API_URL)
  })

  it("clears every instance on logout", async () => {
    const { a } = stage({
      async: META([{ id: "i1", url: "https://a.dev", name: "A" }]),
      secure: { tok_i1: "ta" },
    })
    await clearToken()
    expect(a.instances).toBeUndefined()
    expect(secure.deleteItemAsync).toHaveBeenCalledWith("tok_i1")
  })

  it("writes / resets the primary URL, creating one when absent", async () => {
    stage({
      async: META([{ id: "i1", url: "https://a.dev", name: "A" }]),
      secure: { tok_i1: "ta" },
    })
    await writeApiUrl("https://moved.dev")
    await expect(readApiUrl()).resolves.toBe("https://moved.dev")
    await resetApiUrl()
    await expect(readApiUrl()).resolves.toBe(DEFAULT_API_URL)

    stage()
    await writeApiUrl("https://fresh.dev")
    await expect(readApiUrl()).resolves.toBe("https://fresh.dev")
  })
})

describe("language storage", () => {
  it("reads / returns null / writes", async () => {
    stage({ async: { lang: "en" } })
    await expect(readLang()).resolves.toBe("en")
    stage()
    await expect(readLang()).resolves.toBeNull()
    await writeLang("fr")
    expect(async.setItem).toHaveBeenCalledWith("lang", "fr")
  })
})

describe("read items storage", () => {
  it("returns [] when empty or malformed, parses otherwise, serializes on write", async () => {
    stage()
    await expect(readReadItems()).resolves.toEqual([])
    stage({ async: { read_items: "{not json" } })
    await expect(readReadItems()).resolves.toEqual([])
    stage({ async: { read_items: JSON.stringify(["i1:rss:1"]) } })
    await expect(readReadItems()).resolves.toEqual(["i1:rss:1"])
    await writeReadItems(["i1:rss:1"])
    expect(async.setItem).toHaveBeenCalledWith("read_items", JSON.stringify(["i1:rss:1"]))
  })
})
