import { loginWithPassword, getUserFeed } from "../src/lib/api"

const API_URL = "https://stayup-api.r-sik.workers.dev"

global.fetch = jest.fn()

function mockFetch(status: number, body: unknown) {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

function mockFetchError() {
  ;(global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError("network error"))
}

afterEach(() => jest.clearAllMocks())

describe("loginWithPassword", () => {
  it("returns token on success", async () => {
    mockFetch(200, { token: "tok-123" })
    const token = await loginWithPassword("a@b.com", "pass", API_URL)
    expect(token).toBe("tok-123")
  })

  it("throws on 401", async () => {
    mockFetch(401, {})
    await expect(loginWithPassword("a@b.com", "wrong", API_URL)).rejects.toThrow(
      "Identifiants invalides.",
    )
  })

  it("throws on 500", async () => {
    mockFetch(500, {})
    await expect(loginWithPassword("a@b.com", "pass", API_URL)).rejects.toThrow("Erreur serveur")
  })
})

describe("getUserFeed (apiFetch retry)", () => {
  it("retries on 5xx and succeeds on second attempt", async () => {
    mockFetch(503, {})
    mockFetch(200, {
      repositories: [],
      connectors: { changelog: [], youtube: [], rss: [], scrap: [] },
    })
    const result = await getUserFeed("user-1", "tok", API_URL)
    expect(result.repositories).toEqual([])
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it("retries on network error (TypeError) once", async () => {
    mockFetchError()
    mockFetch(200, {
      repositories: [],
      connectors: { changelog: [], youtube: [], rss: [], scrap: [] },
    })
    const result = await getUserFeed("user-1", "tok", API_URL)
    expect(result.repositories).toEqual([])
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it("throws if both attempts fail", async () => {
    mockFetch(503, {})
    mockFetch(503, {})
    await expect(getUserFeed("user-1", "tok", API_URL)).rejects.toThrow()
  })
})
