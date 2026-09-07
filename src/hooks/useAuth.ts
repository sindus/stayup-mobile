import { useState, useEffect, useCallback } from "react"
import * as WebBrowser from "expo-web-browser"
import * as AuthSession from "expo-auth-session"
import {
  type Instance,
  readInstances,
  upsertPrimaryInstance,
  addInstance as storeAddInstance,
  removeInstance as storeRemoveInstance,
  renameInstance as storeRenameInstance,
  setPrimaryInstance as storeSetPrimary,
  updateInstanceToken,
  clearInstances,
  readApiUrl,
  hostOf,
} from "@/lib/store"
import { decodeToken, isTokenExpired } from "@/lib/session"
import { ApiError, fetchAuthConfig, loginWithPassword, registerWithPassword } from "@/lib/api"
import { useLanguage } from "@/context/LanguageContext"
import type { AppSession } from "@/lib/session"

WebBrowser.maybeCompleteAuthSession()

/** A session, attached to its instance. `session` (compat) = the primary. */
export interface InstanceSession extends AppSession {
  instanceId: string
  instanceName: string
  instanceUrl: string
  expired: boolean
}

export type AuthMethod =
  | { kind: "password"; email: string; password: string }
  | { kind: "oauth"; provider: "github" | "google" }

/** Result of creating an account on an instance: `{}` = account active and
 *  instance added; `{ pending: true }` = instance in `approval` mode, account
 *  awaiting admin approval (nothing is added); `{ error }` otherwise. */
export type RegisterInstanceResult = { pending?: boolean; error?: string }

interface UseAuth {
  session: InstanceSession | null
  sessions: InstanceSession[]
  instances: Instance[]
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  loginOAuth: (provider: "github" | "google") => Promise<void>
  logout: () => Promise<void>
  addInstance: (url: string, method: AuthMethod) => Promise<string | null>
  registerInstance: (
    url: string,
    creds: { name: string; email: string; password: string },
  ) => Promise<RegisterInstanceResult>
  reconnectInstance: (id: string, method: AuthMethod) => Promise<string | null>
  removeInstance: (id: string) => Promise<void>
  renameInstance: (id: string, name: string) => Promise<void>
  setPrimary: (id: string) => Promise<void>
}

function toSession(inst: Instance): InstanceSession {
  return {
    ...decodeToken(inst.token),
    instanceId: inst.id,
    instanceName: inst.name,
    instanceUrl: inst.url,
    expired: isTokenExpired(inst.token),
  }
}

/** Gets a token for `url`. Returns `null` if OAuth is cancelled (not an error:
 *  the caller shows nothing). */
async function tokenFor(url: string, method: AuthMethod): Promise<string | null> {
  if (method.kind === "password") {
    return loginWithPassword(method.email, method.password, url)
  }
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "stayup", path: "auth/callback" })
  const authUrl = `${url}/auth/oauth/${method.provider}?redirect_uri=${encodeURIComponent(redirectUri)}`
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri)
  if (result.type === "success" && result.url) {
    return new URL(result.url).searchParams.get("token")
  }
  return null
}

export function useAuth(): UseAuth {
  const { t } = useLanguage()

  const authErrorMessage = useCallback(
    (err: unknown, taken: string): string => {
      if (err instanceof ApiError) {
        if (err.status === 401) return t.errors.invalidCredentials
        if (err.status === 409) return taken
      }
      return t.errors.serverError
    },
    [t],
  )

  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setInstances(await readInstances())
  }, [])

  useEffect(() => {
    ;(async () => {
      await reload()
      setLoading(false)
    })()
  }, [reload])

  const sessions = instances.filter((i) => i.token).map(toSession)
  const session = sessions[0] ?? null

  const primaryLogin = useCallback(
    async (run: () => Promise<string | null>) => {
      setLoading(true)
      setError(null)
      try {
        const url = await readApiUrl()
        const token = await run()
        if (token) {
          await upsertPrimaryInstance({ url, token })
          await reload()
        }
      } catch (err) {
        setError(authErrorMessage(err, t.errors.emailTaken))
      } finally {
        setLoading(false)
      }
    },
    [authErrorMessage, reload, t],
  )

  const login = useCallback(
    (email: string, password: string) =>
      primaryLogin(async () => loginWithPassword(email, password, await readApiUrl())),
    [primaryLogin],
  )

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setLoading(true)
      setError(null)
      try {
        const url = await readApiUrl()
        const outcome = await registerWithPassword(name, email, password, url)
        if ("pending" in outcome) {
          setError(t.auth.accountPending)
          return
        }
        await upsertPrimaryInstance({ url, token: outcome.token })
        await reload()
      } catch (err) {
        setError(authErrorMessage(err, t.errors.emailTaken))
      } finally {
        setLoading(false)
      }
    },
    [authErrorMessage, reload, t],
  )

  const loginOAuth = useCallback(
    (provider: "github" | "google") =>
      primaryLogin(async () => tokenFor(await readApiUrl(), { kind: "oauth", provider })),
    [primaryLogin],
  )

  const logout = useCallback(async () => {
    await clearInstances()
    await reload()
  }, [reload])

  const resolveName = useCallback(async (url: string): Promise<string> => {
    const config = await fetchAuthConfig(url).catch(() => null)
    return config?.name?.trim() || hostOf(url)
  }, [])

  const addInstance = useCallback(
    async (url: string, method: AuthMethod): Promise<string | null> => {
      try {
        const token = await tokenFor(url, method)
        if (!token) return null
        await storeAddInstance({ url, name: await resolveName(url), token })
        await reload()
        return null
      } catch (err) {
        return authErrorMessage(err, t.errors.emailTaken)
      }
    },
    [authErrorMessage, reload, resolveName, t],
  )

  const registerInstance = useCallback(
    async (
      url: string,
      creds: { name: string; email: string; password: string },
    ): Promise<RegisterInstanceResult> => {
      try {
        const outcome = await registerWithPassword(creds.name, creds.email, creds.password, url)
        if ("pending" in outcome) return { pending: true }
        await storeAddInstance({ url, name: await resolveName(url), token: outcome.token })
        await reload()
        return {}
      } catch (err) {
        return { error: authErrorMessage(err, t.errors.emailTaken) }
      }
    },
    [authErrorMessage, reload, resolveName, t],
  )

  const reconnectInstance = useCallback(
    async (id: string, method: AuthMethod): Promise<string | null> => {
      const target = instances.find((i) => i.id === id)
      if (!target) return t.errors.serverError
      try {
        const token = await tokenFor(target.url, method)
        if (!token) return null
        await updateInstanceToken(id, token)
        await reload()
        return null
      } catch (err) {
        return authErrorMessage(err, t.errors.emailTaken)
      }
    },
    [authErrorMessage, instances, reload, t],
  )

  const removeInstance = useCallback(
    async (id: string) => {
      if (instances[0]?.id === id) await clearInstances()
      else await storeRemoveInstance(id)
      await reload()
    },
    [instances, reload],
  )

  const renameInstance = useCallback(
    async (id: string, name: string) => {
      await storeRenameInstance(id, name)
      await reload()
    },
    [reload],
  )

  const setPrimary = useCallback(
    async (id: string) => {
      await storeSetPrimary(id)
      await reload()
    },
    [reload],
  )

  return {
    session,
    sessions,
    instances,
    loading,
    error,
    login,
    register,
    loginOAuth,
    logout,
    addInstance,
    registerInstance,
    reconnectInstance,
    removeInstance,
    renameInstance,
    setPrimary,
  }
}
