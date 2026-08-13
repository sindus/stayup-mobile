import { renderHook, waitFor, act } from "@testing-library/react-native"
import * as SecureStore from "expo-secure-store"
import { useFeed } from "@/hooks/useFeed"
import { getUserFeed } from "@/lib/api"

jest.mock("@/lib/api", () => ({ getUserFeed: jest.fn() }))

const secureStore = SecureStore as unknown as { getItemAsync: jest.Mock }
const mockedGetUserFeed = getUserFeed as jest.Mock

const emptyConnectors = { changelog: [], youtube: [], rss: [], scrap: [] }

beforeEach(() => {
  secureStore.getItemAsync.mockResolvedValue("tok")
})

describe("useFeed", () => {
  it("maps repositories to fluxes with a derived identifier", async () => {
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
        {
          id: "link-2",
          repository_id: 11,
          provider: "youtube",
          url: "https://www.youtube.com/@fireship",
          config: {},
          created_at: "2026-01-02",
        },
      ],
      connectors: emptyConnectors,
    })

    const { result } = renderHook(() => useFeed("user-1"))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.fluxes).toEqual([
      {
        id: "link-1",
        repository_id: 10,
        provider: "changelog",
        url: "https://github.com/facebook/react/",
        identifier: "facebook/react",
      },
      {
        id: "link-2",
        repository_id: 11,
        provider: "youtube",
        url: "https://www.youtube.com/@fireship",
        identifier: "@fireship",
      },
    ])
    expect(result.current.connectors).toEqual(emptyConnectors)
    expect(result.current.error).toBeNull()
  })

  it("errors out when no token is stored", async () => {
    secureStore.getItemAsync.mockResolvedValue(null)
    const { result } = renderHook(() => useFeed("user-1"))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe("Token manquant")
    expect(mockedGetUserFeed).not.toHaveBeenCalled()
  })

  it("surfaces the API error message", async () => {
    mockedGetUserFeed.mockRejectedValue(new Error("StayUp API error 500"))
    const { result } = renderHook(() => useFeed("user-1"))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe("StayUp API error 500")
  })

  it("falls back to a generic message for a non-Error rejection", async () => {
    mockedGetUserFeed.mockRejectedValue("boom")
    const { result } = renderHook(() => useFeed("user-1"))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe("Erreur de chargement.")
  })

  it("refresh reloads the feed", async () => {
    mockedGetUserFeed.mockResolvedValue({ repositories: [], connectors: emptyConnectors })
    const { result } = renderHook(() => useFeed("user-1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockedGetUserFeed).toHaveBeenCalledTimes(1)

    await act(async () => {
      result.current.refresh()
    })

    await waitFor(() => expect(mockedGetUserFeed).toHaveBeenCalledTimes(2))
  })
})
