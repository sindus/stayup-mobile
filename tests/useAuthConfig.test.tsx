import { renderHook, waitFor, act } from "@testing-library/react-native"
import { useAuthConfig } from "@/hooks/useAuthConfig"
import { fetchAuthConfig } from "@/lib/api"
import { readApiUrl } from "@/lib/store"

jest.mock("@/lib/api", () => ({ fetchAuthConfig: jest.fn() }))
jest.mock("@/lib/store", () => ({ readApiUrl: jest.fn() }))

const mockedFetch = fetchAuthConfig as jest.Mock
const mockedReadApiUrl = readApiUrl as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockedReadApiUrl.mockResolvedValue("https://api.example.com")
  mockedFetch.mockResolvedValue({
    registrationMode: "approval",
    emailPassword: true,
    oauth: { github: true, google: false },
  })
})

describe("useAuthConfig", () => {
  it("reads the API host and its config on mount", async () => {
    const { result } = renderHook(() => useAuthConfig())

    await waitFor(() => expect(result.current.config).not.toBeNull())
    expect(result.current.apiHost).toBe("api.example.com")
    expect(result.current.config?.registrationMode).toBe("approval")
    expect(mockedFetch).toHaveBeenCalledWith("https://api.example.com")
  })

  it("falls back to the raw string when the stored API URL is not a URL", async () => {
    mockedReadApiUrl.mockResolvedValue("not a url")
    const { result } = renderHook(() => useAuthConfig())

    await waitFor(() => expect(result.current.apiHost).toBe("not a url"))
  })

  it("re-reads on refresh", async () => {
    const { result } = renderHook(() => useAuthConfig())
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1))

    mockedReadApiUrl.mockResolvedValue("https://other.example.com")
    await act(() => result.current.refresh())

    expect(result.current.apiHost).toBe("other.example.com")
    expect(mockedFetch).toHaveBeenCalledWith("https://other.example.com")
  })

  it("leaves config null when the API has no /auth/config", async () => {
    mockedFetch.mockResolvedValue(null)
    const { result } = renderHook(() => useAuthConfig())

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled())
    expect(result.current.config).toBeNull()
  })
})
