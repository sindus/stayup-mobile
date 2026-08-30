import { renderHook, waitFor, act } from "@testing-library/react-native"
import { useFeed } from "@/hooks/useFeed"
import { getUserFeed, getConnectorProviders } from "@/lib/api"
import { RAW_PROVIDERS } from "./_templates"
import type { Instance } from "@/lib/store"

jest.mock("@/lib/api", () => ({ getUserFeed: jest.fn(), getConnectorProviders: jest.fn() }))

const mockedGetUserFeed = getUserFeed as jest.Mock
const mockedGetProviders = getConnectorProviders as jest.Mock

function makeJwt(payload: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
  return `eyJhbGciOiJIUzI1NiJ9.${b64}.sig`
}
const tokenFor = (sub: string, offset = 3600) =>
  makeJwt({ sub, exp: Math.floor(Date.now() / 1000) + offset })

function instance(over: Partial<Instance> = {}): Instance {
  return { id: "i1", url: "https://api.test", name: "api.test", token: tokenFor("user-1"), ...over }
}

const emptyConnectors = { changelog: [], youtube: [], rss: [], scrap: [] }

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetProviders.mockResolvedValue(RAW_PROVIDERS as never)
  mockedGetUserFeed.mockResolvedValue({ repositories: [], connectors: emptyConnectors })
})

describe("useFeed", () => {
  it("fans out over an instance and tags fluxes + rows with it", async () => {
    mockedGetUserFeed.mockResolvedValue({
      repositories: [
        {
          id: "link-1",
          repository_id: 10,
          provider: "changelog",
          url: "https://github.com/facebook/react/",
          config: {},
          created_at: "2026-01-01",
        },
      ],
      connectors: {
        ...emptyConnectors,
        changelog: [{ id: 5, repository_id: 10, executed_at: "" }],
      },
    })

    const { result } = renderHook(() => useFeed([instance()]))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getUserFeed).toHaveBeenCalledWith("user-1", instance().token, "https://api.test")
    expect(result.current.fluxes[0]).toMatchObject({
      id: "link-1",
      identifier: "facebook/react",
      instanceId: "i1",
      instanceName: "api.test",
    })
    expect(result.current.connectors?.changelog?.[0]).toMatchObject({
      _instance_id: "i1",
      _instance_name: "api.test",
    })
    expect(result.current.instanceErrors).toEqual([])
  })

  it("merges two instances and lists a failed one as an error", async () => {
    mockedGetUserFeed
      .mockResolvedValueOnce({ repositories: [], connectors: emptyConnectors })
      .mockRejectedValueOnce(new Error("down"))
    const a = instance({ id: "a", name: "A", token: tokenFor("ua") })
    const b = instance({ id: "b", name: "B", token: tokenFor("ub") })

    const { result } = renderHook(() => useFeed([a, b]))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.instanceErrors).toEqual([{ instanceId: "b", instanceName: "B" }])
    expect(result.current.error).toBeNull()
  })

  it("flags an error only when every live instance fails", async () => {
    mockedGetUserFeed.mockRejectedValue(new Error("down"))
    const { result } = renderHook(() => useFeed([instance()]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe("Erreur de chargement.")
    expect(result.current.connectors).toBeNull()
  })

  it("does not fetch an expired instance but reports it", async () => {
    const { result } = renderHook(() => useFeed([instance({ token: tokenFor("user-1", -10) })]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getUserFeed).not.toHaveBeenCalled()
    expect(result.current.instanceErrors).toEqual([{ instanceId: "i1", instanceName: "api.test" }])
  })

  it("keeps the feed usable when a provider list fails for one instance", async () => {
    mockedGetProviders.mockRejectedValue(new Error("templates offline"))
    mockedGetUserFeed.mockResolvedValue({
      repositories: [
        {
          id: "l1",
          repository_id: 1,
          provider: "rss",
          url: "https://blog.example.com/feed",
          config: {},
          created_at: "",
        },
      ],
      connectors: emptyConnectors,
    })
    const { result } = renderHook(() => useFeed([instance()]))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.templates).toEqual({})
    expect(result.current.fluxes[0].identifier).toBe("blog.example.com/feed")
    expect(result.current.instanceErrors).toEqual([])
  })

  it("completes a missing template from another instance", async () => {
    mockedGetProviders
      .mockResolvedValueOnce([{ name: "rss", displayName: "RSS" }] as never)
      .mockResolvedValueOnce(RAW_PROVIDERS as never)
    const a = instance({ id: "a", token: tokenFor("ua") })
    const b = instance({ id: "b", token: tokenFor("ub") })
    const { result } = renderHook(() => useFeed([a, b]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.templates.rss?.template).toBeTruthy()
  })

  it("handles a repositories-only response (no connectors, no config, no template)", async () => {
    mockedGetProviders.mockResolvedValue([] as never)
    mockedGetUserFeed.mockResolvedValue({
      repositories: [{ id: "l9", repository_id: 9, url: "https://x.dev", provider: "custom" }],
    })
    const { result } = renderHook(() => useFeed([instance()]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.connectors).toEqual({})
    expect(result.current.fluxes[0]).toMatchObject({ id: "l9", instanceId: "i1" })
  })

  it("refetches on refresh and reloads when the list changes", async () => {
    const { result, rerender } = renderHook(({ list }: { list: Instance[] }) => useFeed(list), {
      initialProps: { list: [instance({ id: "a", token: tokenFor("ua") })] },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockedGetUserFeed).toHaveBeenCalledTimes(1)

    await act(async () => {
      result.current.refresh()
    })
    await waitFor(() => expect(mockedGetUserFeed).toHaveBeenCalledTimes(2))

    rerender({ list: [instance({ id: "a", token: tokenFor("ua2") })] })
    await waitFor(() => expect(mockedGetUserFeed).toHaveBeenCalledTimes(3))
  })
})
