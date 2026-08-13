import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  readToken,
  writeToken,
  clearToken,
  readApiUrl,
  readLang,
  writeLang,
  readReadItems,
  writeReadItems,
} from "../src/lib/store"

const secureStore = SecureStore as unknown as {
  getItemAsync: jest.Mock
  setItemAsync: jest.Mock
  deleteItemAsync: jest.Mock
}
const asyncStorage = AsyncStorage as unknown as { getItem: jest.Mock; setItem: jest.Mock }

afterEach(() => jest.clearAllMocks())

describe("token storage", () => {
  it("reads the token from the secure store", async () => {
    secureStore.getItemAsync.mockResolvedValueOnce("tok-123")
    await expect(readToken()).resolves.toBe("tok-123")
    expect(secureStore.getItemAsync).toHaveBeenCalledWith("auth_token")
  })

  it("returns null when no token is stored", async () => {
    secureStore.getItemAsync.mockResolvedValueOnce(null)
    await expect(readToken()).resolves.toBeNull()
  })

  it("writes the token", async () => {
    await writeToken("tok-456")
    expect(secureStore.setItemAsync).toHaveBeenCalledWith("auth_token", "tok-456")
  })

  it("clears the token", async () => {
    await clearToken()
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("auth_token")
  })
})

describe("readApiUrl", () => {
  it("returns the StayUp API base url", async () => {
    await expect(readApiUrl()).resolves.toBe("https://stayup-api.r-sik.workers.dev")
  })
})

describe("language storage", () => {
  it("reads the stored language", async () => {
    asyncStorage.getItem.mockResolvedValueOnce("en")
    await expect(readLang()).resolves.toBe("en")
    expect(asyncStorage.getItem).toHaveBeenCalledWith("lang")
  })

  it("returns null when nothing is stored", async () => {
    asyncStorage.getItem.mockResolvedValueOnce(null)
    await expect(readLang()).resolves.toBeNull()
  })

  it("writes the language", async () => {
    await writeLang("fr")
    expect(asyncStorage.setItem).toHaveBeenCalledWith("lang", "fr")
  })
})

describe("read items storage", () => {
  it("returns an empty array when nothing is stored", async () => {
    asyncStorage.getItem.mockResolvedValueOnce(null)
    await expect(readReadItems()).resolves.toEqual([])
  })

  it("parses the stored id list", async () => {
    asyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(["rss:1", "youtube:2"]))
    await expect(readReadItems()).resolves.toEqual(["rss:1", "youtube:2"])
  })

  it("returns an empty array when the stored value is malformed", async () => {
    asyncStorage.getItem.mockResolvedValueOnce("{not json")
    await expect(readReadItems()).resolves.toEqual([])
  })

  it("serializes the id list on write", async () => {
    await writeReadItems(["rss:1"])
    expect(asyncStorage.setItem).toHaveBeenCalledWith("read_items", JSON.stringify(["rss:1"]))
  })
})
