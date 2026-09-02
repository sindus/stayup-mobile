import { renderHook, waitFor, act } from "@testing-library/react-native"
import * as WebBrowser from "expo-web-browser"
import { useAuth } from "@/hooks/useAuth"
import { ApiError, loginWithPassword, registerWithPassword, fetchAuthConfig } from "@/lib/api"
import {
  readInstances,
  upsertPrimaryInstance,
  addInstance,
  removeInstance,
  renameInstance,
  setPrimaryInstance,
  updateInstanceToken,
  clearInstances,
  readApiUrl,
} from "@/lib/store"
import { LanguageProvider } from "@/context/LanguageContext"
import { en } from "@/lib/translations"

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
  fetchAuthConfig: jest.fn().mockResolvedValue(null),
}))
jest.mock("@/lib/store", () => ({
  readInstances: jest.fn().mockResolvedValue([]),
  upsertPrimaryInstance: jest.fn().mockResolvedValue(undefined),
  addInstance: jest.fn().mockResolvedValue(undefined),
  removeInstance: jest.fn().mockResolvedValue(undefined),
  renameInstance: jest.fn().mockResolvedValue(undefined),
  setPrimaryInstance: jest.fn().mockResolvedValue(undefined),
  updateInstanceToken: jest.fn().mockResolvedValue(undefined),
  clearInstances: jest.fn().mockResolvedValue(undefined),
  readApiUrl: jest.fn().mockResolvedValue("https://api.test"),
  hostOf: (u: string) => u,
  readLang: jest.fn().mockResolvedValue(null),
  writeLang: jest.fn().mockResolvedValue(undefined),
}))

const webBrowser = WebBrowser as unknown as { openAuthSessionAsync: jest.Mock }
const mockedLogin = loginWithPassword as jest.Mock
const mockedRegister = registerWithPassword as jest.Mock
const mockedReadInstances = readInstances as jest.Mock

function wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}
const renderAuth = () => renderHook(() => useAuth(), { wrapper })

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
const validToken = makeToken()
const expiredToken = makeToken({ exp: Math.floor(Date.now() / 1000) - 10 })
const instance = (over: Record<string, unknown> = {}) => ({
  id: "i1",
  url: "https://api.test",
  name: "api.test",
  token: validToken,
  ...over,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockedReadInstances.mockResolvedValue([])
  ;(readApiUrl as jest.Mock).mockResolvedValue("https://api.test")
  ;(fetchAuthConfig as jest.Mock).mockResolvedValue(null)
})

describe("initial restore", () => {
  it("restores the primary session from a stored instance", async () => {
    mockedReadInstances.mockResolvedValue([instance()])
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toMatchObject({
      userId: "user-1",
      instanceId: "i1",
      expired: false,
    })
  })

  it("flags an expired primary session", async () => {
    mockedReadInstances.mockResolvedValue([instance({ token: expiredToken })])
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session?.expired).toBe(true)
  })

  it("stays signed out with no instance", async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
  })
})

describe("login / register", () => {
  it("upserts the primary and exposes the session", async () => {
    mockedLogin.mockResolvedValue(validToken)
    mockedReadInstances.mockResolvedValueOnce([]).mockResolvedValue([instance()])
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.login("jean@example.com", "pw"))

    expect(mockedLogin).toHaveBeenCalledWith("jean@example.com", "pw", "https://api.test")
    expect(upsertPrimaryInstance).toHaveBeenCalledWith({
      url: "https://api.test",
      token: validToken,
    })
    expect(result.current.session?.email).toBe("jean@example.com")
  })

  it("translates a 401", async () => {
    mockedLogin.mockRejectedValue(new ApiError(401, "x"))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.login("bad@x.io", "no"))
    expect(result.current.error).toBe(en.errors.invalidCredentials)
  })

  it("translates a 409 on register", async () => {
    mockedRegister.mockRejectedValue(new ApiError(409, "x"))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.register("J", "taken@x.io", "pw123456"))
    expect(result.current.error).toBe(en.errors.emailTaken)
  })

  it("surfaces the pending-approval message and stores nothing in approval mode", async () => {
    mockedRegister.mockResolvedValue({ pending: true })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.register("J", "j@x.io", "pw123456"))
    expect(result.current.error).toBe(en.auth.accountPending)
    expect(upsertPrimaryInstance).not.toHaveBeenCalled()
  })

  it("falls back to a generic message otherwise", async () => {
    mockedLogin.mockRejectedValue("boom")
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.login("a@b.c", "x"))
    expect(result.current.error).toBe(en.errors.serverError)
  })
})

describe("OAuth", () => {
  it("applies the token returned by the auth session", async () => {
    webBrowser.openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: `stayup://auth/callback?token=${validToken}`,
    })
    mockedReadInstances.mockResolvedValueOnce([]).mockResolvedValue([instance()])
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.loginOAuth("github"))
    expect(upsertPrimaryInstance).toHaveBeenCalledWith({
      url: "https://api.test",
      token: validToken,
    })
  })

  it("does nothing (no error) when the auth session is cancelled", async () => {
    webBrowser.openAuthSessionAsync.mockResolvedValue({ type: "cancel" })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.loginOAuth("google"))
    expect(result.current.error).toBeNull()
    expect(upsertPrimaryInstance).not.toHaveBeenCalled()
  })
})

describe("logout", () => {
  it("clears every instance", async () => {
    mockedReadInstances.mockResolvedValueOnce([instance()]).mockResolvedValue([])
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.session).not.toBeNull())
    await act(() => result.current.logout())
    expect(clearInstances).toHaveBeenCalled()
    expect(result.current.session).toBeNull()
  })
})

describe("secondary instances", () => {
  it("adds an instance with its resolved name", async () => {
    ;(fetchAuthConfig as jest.Mock).mockResolvedValue({
      name: "Beta",
      registrationMode: "open",
      emailPassword: true,
      oauth: { github: false, google: false },
    })
    mockedLogin.mockResolvedValue(validToken)
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    let err: string | null = "x"
    await act(async () => {
      err = await result.current.addInstance("https://b.io", {
        kind: "password",
        email: "u@b.io",
        password: "pw",
      })
    })
    expect(err).toBeNull()
    expect(addInstance).toHaveBeenCalledWith({
      url: "https://b.io",
      name: "Beta",
      token: validToken,
    })
  })

  it("falls back to the host name when the config lookup fails", async () => {
    ;(fetchAuthConfig as jest.Mock).mockRejectedValue(new Error("offline"))
    mockedLogin.mockResolvedValue(validToken)
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addInstance("https://b.io", {
        kind: "password",
        email: "u@b.io",
        password: "pw",
      })
    })
    expect(addInstance).toHaveBeenCalledWith({
      url: "https://b.io",
      name: "https://b.io",
      token: validToken,
    })
  })

  it("returns null (no add) when the OAuth add is cancelled", async () => {
    webBrowser.openAuthSessionAsync.mockResolvedValue({ type: "cancel" })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    let err: string | null = "x"
    await act(async () => {
      err = await result.current.addInstance("https://b.io", { kind: "oauth", provider: "github" })
    })
    expect(err).toBeNull()
    expect(addInstance).not.toHaveBeenCalled()
  })

  it("returns a translated error when adding fails", async () => {
    mockedLogin.mockRejectedValue(new ApiError(401, "no"))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    let err: string | null = null
    await act(async () => {
      err = await result.current.addInstance("https://b.io", {
        kind: "password",
        email: "u@b.io",
        password: "bad",
      })
    })
    expect(err).toBe(en.errors.invalidCredentials)
  })

  it("registers a new account on an instance and adds it", async () => {
    ;(fetchAuthConfig as jest.Mock).mockResolvedValue(null)
    mockedRegister.mockResolvedValue({ token: validToken })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res: { pending?: boolean; error?: string } = {}
    await act(async () => {
      res = await result.current.registerInstance("https://b.io", {
        name: "Bea",
        email: "bea@b.io",
        password: "pass1234",
      })
    })

    expect(res).toEqual({})
    expect(mockedRegister).toHaveBeenCalledWith("Bea", "bea@b.io", "pass1234", "https://b.io")
    expect(addInstance).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://b.io", token: validToken }),
    )
  })

  it("returns { pending } and stores nothing when the instance needs approval", async () => {
    mockedRegister.mockResolvedValue({ pending: true })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res: { pending?: boolean; error?: string } = {}
    await act(async () => {
      res = await result.current.registerInstance("https://b.io", {
        name: "Bea",
        email: "bea@b.io",
        password: "pass1234",
      })
    })

    expect(res).toEqual({ pending: true })
    expect(addInstance).not.toHaveBeenCalled()
  })

  it("returns a translated error when registration fails", async () => {
    mockedRegister.mockRejectedValue(new ApiError(409, "taken"))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res: { pending?: boolean; error?: string } = {}
    await act(async () => {
      res = await result.current.registerInstance("https://b.io", {
        name: "Bea",
        email: "taken@b.io",
        password: "pass1234",
      })
    })

    expect(res).toEqual({ error: en.errors.emailTaken })
    expect(addInstance).not.toHaveBeenCalled()
  })

  it("reconnects, and reports an unknown id", async () => {
    mockedReadInstances.mockResolvedValue([instance({ token: expiredToken })])
    mockedLogin.mockResolvedValue(validToken)
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.instances).toHaveLength(1))

    await act(() =>
      result.current.reconnectInstance("i1", { kind: "password", email: "u@b.io", password: "pw" }),
    )
    expect(updateInstanceToken).toHaveBeenCalledWith("i1", validToken)

    let err: string | null = null
    await act(async () => {
      err = await result.current.reconnectInstance("nope", {
        kind: "password",
        email: "u@b.io",
        password: "pw",
      })
    })
    expect(err).toBe(en.errors.serverError)
  })

  it("returns null (no token write) when an OAuth reconnect is cancelled", async () => {
    mockedReadInstances.mockResolvedValue([instance({ token: expiredToken })])
    webBrowser.openAuthSessionAsync.mockResolvedValue({ type: "cancel" })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.instances).toHaveLength(1))

    let err: string | null = "x"
    await act(async () => {
      err = await result.current.reconnectInstance("i1", { kind: "oauth", provider: "github" })
    })
    expect(err).toBeNull()
    expect(updateInstanceToken).not.toHaveBeenCalled()
  })

  it("translates a failure raised while reconnecting", async () => {
    mockedReadInstances.mockResolvedValue([instance({ token: expiredToken })])
    mockedLogin.mockRejectedValue(new ApiError(401, "no"))
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.instances).toHaveLength(1))

    let err: string | null = null
    await act(async () => {
      err = await result.current.reconnectInstance("i1", {
        kind: "password",
        email: "u@b.io",
        password: "bad",
      })
    })
    expect(err).toBe(en.errors.invalidCredentials)
  })

  it("removes a secondary, and clears everything when the primary is removed", async () => {
    mockedReadInstances.mockResolvedValue([instance(), instance({ id: "i2" })])
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.instances).toHaveLength(2))

    await act(() => result.current.removeInstance("i2"))
    expect(removeInstance).toHaveBeenCalledWith("i2")

    await act(() => result.current.removeInstance("i1"))
    expect(clearInstances).toHaveBeenCalled()
  })

  it("renames and promotes", async () => {
    mockedReadInstances.mockResolvedValue([instance(), instance({ id: "i2" })])
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.instances).toHaveLength(2))

    await act(() => result.current.renameInstance("i2", "Two"))
    expect(renameInstance).toHaveBeenCalledWith("i2", "Two")
    await act(() => result.current.setPrimary("i2"))
    expect(setPrimaryInstance).toHaveBeenCalledWith("i2")
  })
})
