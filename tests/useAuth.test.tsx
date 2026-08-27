import { renderHook, waitFor, act } from "@testing-library/react-native"
import * as SecureStore from "expo-secure-store"
import * as WebBrowser from "expo-web-browser"
import { useAuth } from "@/hooks/useAuth"
import { ApiError, loginWithPassword, registerWithPassword } from "@/lib/api"
import { LanguageProvider } from "@/context/LanguageContext"
import { en } from "@/lib/translations"

// useAuth traduit les erreurs à partir du statut porté par ApiError : le mock doit
// donc l'exposer, sinon `err instanceof ApiError` ne peut jamais être vrai.
jest.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
      this.name = "ApiError"
    }
  },
  loginWithPassword: jest.fn(),
  registerWithPassword: jest.fn(),
}))

const secureStore = SecureStore as unknown as {
  getItemAsync: jest.Mock
  setItemAsync: jest.Mock
  deleteItemAsync: jest.Mock
}
const webBrowser = WebBrowser as unknown as { openAuthSessionAsync: jest.Mock }
const mockedLogin = loginWithPassword as jest.Mock
const mockedRegister = registerWithPassword as jest.Mock

// useAuth lit désormais les traductions : il lui faut le provider.
function wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper })
}

/** JWT non signé, suffisant pour decodeToken/isTokenExpired. */
function makeToken(overrides: Record<string, unknown> = {}): string {
  const payload = {
    sub: "user-1",
    name: "Jean",
    email: "jean@example.com",
    role: "user",
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  }
  return `${btoa("{}")}.${btoa(JSON.stringify(payload))}.sig`
}

beforeEach(() => {
  secureStore.getItemAsync.mockResolvedValue(null)
})

describe("useAuth — restauration de session", () => {
  it("starts with no session when the store is empty", async () => {
    const { result } = renderAuth()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
  })

  it("restores a valid session from the stored token", async () => {
    secureStore.getItemAsync.mockResolvedValue(makeToken())
    const { result } = renderAuth()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toEqual({
      userId: "user-1",
      name: "Jean",
      email: "jean@example.com",
      role: "user",
    })
  })

  it("discards an expired token", async () => {
    secureStore.getItemAsync.mockResolvedValue(makeToken({ exp: 1 }))
    const { result } = renderAuth()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("auth_token")
  })
})

describe("useAuth — login", () => {
  it("stores the token and exposes the session", async () => {
    mockedLogin.mockResolvedValue(makeToken())
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.login("jean@example.com", "password")
    })

    expect(secureStore.setItemAsync).toHaveBeenCalledWith("auth_token", expect.any(String))
    expect(result.current.session?.email).toBe("jean@example.com")
    expect(result.current.error).toBeNull()
  })

  // Le message de l'API est en anglais quelle que soit la langue de l'app : on
  // traduit à partir du statut plutôt que de l'afficher tel quel.
  it("translates a 401 instead of showing the API message", async () => {
    mockedLogin.mockRejectedValue(new ApiError(401, "Invalid credentials"))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.login("jean@example.com", "wrong")
    })

    expect(result.current.error).toBe(en.errors.invalidCredentials)
    expect(result.current.session).toBeNull()
  })

  it("falls back to a generic message for any other rejection", async () => {
    mockedLogin.mockRejectedValue("boom")
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.login("jean@example.com", "wrong")
    })

    expect(result.current.error).toBe(en.errors.serverError)
  })
})

describe("useAuth — register", () => {
  it("stores the token on success", async () => {
    mockedRegister.mockResolvedValue(makeToken())
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.register("Jean", "jean@example.com", "password")
    })

    expect(result.current.session?.name).toBe("Jean")
  })

  it("translates a 409 into the taken-email message", async () => {
    mockedRegister.mockRejectedValue(new ApiError(409, "Email already in use"))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.register("Jean", "jean@example.com", "password")
    })

    expect(result.current.error).toBe(en.errors.emailTaken)
  })

  it("falls back to a generic message for any other rejection", async () => {
    mockedRegister.mockRejectedValue("boom")
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.register("Jean", "jean@example.com", "password")
    })

    expect(result.current.error).toBe(en.errors.serverError)
  })
})

describe("useAuth — OAuth", () => {
  it("opens the provider url and keeps the returned token", async () => {
    const token = makeToken()
    webBrowser.openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: `stayup://auth/callback?token=${token}`,
    })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.loginOAuth("github")
    })

    const [authUrl, redirectUri] = webBrowser.openAuthSessionAsync.mock.calls[0]
    expect(authUrl).toContain("/auth/oauth/github")
    expect(redirectUri).toBe("stayup://auth/callback")
    expect(result.current.session?.userId).toBe("user-1")
  })

  it("stops loading when the user cancels", async () => {
    webBrowser.openAuthSessionAsync.mockResolvedValue({ type: "cancel" })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.loginOAuth("google")
    })

    expect(result.current.session).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it("stops loading when the callback carries no token", async () => {
    webBrowser.openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "stayup://auth/callback",
    })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.loginOAuth("github")
    })

    expect(result.current.session).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it("surfaces an OAuth failure", async () => {
    webBrowser.openAuthSessionAsync.mockRejectedValue(new Error("navigateur indisponible"))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.loginOAuth("github")
    })

    expect(result.current.error).toBe("navigateur indisponible")
  })

  it("falls back to a generic message for any other rejection", async () => {
    webBrowser.openAuthSessionAsync.mockRejectedValue("boom")
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.loginOAuth("github")
    })

    expect(result.current.error).toBe("Erreur OAuth.")
  })
})

describe("useAuth — logout", () => {
  it("clears the token and the session", async () => {
    secureStore.getItemAsync.mockResolvedValue(makeToken())
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.session).not.toBeNull())

    await act(async () => {
      await result.current.logout()
    })

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("auth_token")
    expect(result.current.session).toBeNull()
  })
})
