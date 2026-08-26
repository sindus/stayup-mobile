import {
  loginWithPassword,
  registerWithPassword,
  getUserFeed,
  getConnectorProviders,
  addUserRepository,
  deleteUserRepository,
  getScrapRepos,
  subscribeScrap,
  unsubscribeScrap,
  createScrapRequest,
} from "../src/lib/api"

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

  it("does not retry a 4xx", async () => {
    mockFetch(404, {})
    await expect(getUserFeed("user-1", "tok", API_URL)).rejects.toThrow("StayUp API error 404")
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it("does not retry a non-TypeError rejection", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error("boom"))
    await expect(getUserFeed("user-1", "tok", API_URL)).rejects.toThrow("boom")
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it("sends the bearer token and trims a trailing slash from the base url", async () => {
    mockFetch(200, { repositories: [], connectors: {} })
    await getUserFeed("user-1", "tok", `${API_URL}/`)

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`${API_URL}/ui/users/user-1/feed`)
    expect(init.headers.Authorization).toBe("Bearer tok")
    expect(init.headers["Content-Type"]).toBe("application/json")
  })
})

describe("getConnectorProviders", () => {
  it("returns the discovered providers and sends the bearer token", async () => {
    mockFetch(200, { providers: [{ name: "youtube", displayName: "YouTube" }] })
    const providers = await getConnectorProviders("tok", API_URL)
    expect(providers).toEqual([{ name: "youtube", displayName: "YouTube" }])

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`${API_URL}/connectors/providers`)
    expect(init.headers.Authorization).toBe("Bearer tok")
  })
})

describe("registerWithPassword", () => {
  it("returns the token on success", async () => {
    mockFetch(200, { token: "tok-new" })
    await expect(registerWithPassword("Sika", "a@b.com", "password", API_URL)).resolves.toBe(
      "tok-new",
    )
  })

  it("throws a dedicated message on 409", async () => {
    mockFetch(409, {})
    await expect(registerWithPassword("Sika", "a@b.com", "password", API_URL)).rejects.toThrow(
      "Un compte existe déjà avec cet email.",
    )
  })

  it("throws on any other error status", async () => {
    mockFetch(500, {})
    await expect(registerWithPassword("Sika", "a@b.com", "password", API_URL)).rejects.toThrow(
      "Erreur serveur, réessayez.",
    )
  })
})

describe("repository mutations", () => {
  it("posts a new repository", async () => {
    mockFetch(200, {})
    await addUserRepository("user-1", "tok", API_URL, {
      provider: "changelog",
      url: "https://github.com/facebook/react/",
      config: { max_scraps: 5 },
    })

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`${API_URL}/ui/users/user-1/repositories`)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body).provider).toBe("changelog")
  })

  it("deletes a repository link", async () => {
    mockFetch(200, {})
    await deleteUserRepository("user-1", "link-9", "tok", API_URL)

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`${API_URL}/ui/users/user-1/repositories/link-9`)
    expect(init.method).toBe("DELETE")
  })
})

describe("scrap endpoints", () => {
  it("unwraps the repos list", async () => {
    mockFetch(200, { repos: [{ id: 1, url: "https://example.com" }] })
    const repos = await getScrapRepos("tok", API_URL)
    expect(repos).toHaveLength(1)
    expect(repos[0].id).toBe(1)
  })

  it("subscribes with POST", async () => {
    mockFetch(200, { success: true })
    await subscribeScrap(3, "tok", API_URL)

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`${API_URL}/scrap/3/subscribe`)
    expect(init.method).toBe("POST")
  })

  it("unsubscribes with DELETE", async () => {
    mockFetch(200, { success: true })
    await unsubscribeScrap(3, "tok", API_URL)

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`${API_URL}/scrap/3/subscribe`)
    expect(init.method).toBe("DELETE")
  })

  it("creates a scrap request", async () => {
    mockFetch(200, { id: "req-1" })
    await expect(
      createScrapRequest({ url: "https://example.com" }, "tok", API_URL),
    ).resolves.toEqual({ id: "req-1" })

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`${API_URL}/scrap/requests`)
    expect(JSON.parse(init.body).url).toBe("https://example.com")
  })
})
