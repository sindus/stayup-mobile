import { useState, useEffect, useCallback } from "react"
import * as WebBrowser from "expo-web-browser"
import * as AuthSession from "expo-auth-session"
import { readToken, writeToken, clearToken, readApiUrl } from "@/lib/store"
import { decodeToken, isTokenExpired } from "@/lib/session"
import { loginWithPassword, registerWithPassword } from "@/lib/api"
import type { AppSession } from "@/lib/session"

WebBrowser.maybeCompleteAuthSession()

interface AuthState {
  session: AppSession | null
  loading: boolean
  error: string | null
}

interface UseAuth extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  loginOAuth: (provider: "github" | "google") => Promise<void>
  logout: () => Promise<void>
}

export function useAuth(): UseAuth {
  const [state, setState] = useState<AuthState>({
    session: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    ;(async () => {
      const token = await readToken()
      if (token && !isTokenExpired(token)) {
        setState({ session: decodeToken(token), loading: false, error: null })
      } else {
        if (token) await clearToken()
        setState({ session: null, loading: false, error: null })
      }
    })()
  }, [])

  const applyToken = useCallback(async (token: string) => {
    await writeToken(token)
    setState({ session: decodeToken(token), loading: false, error: null })
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const apiUrl = await readApiUrl()
        const token = await loginWithPassword(email, password, apiUrl)
        await applyToken(token)
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Erreur de connexion.",
        }))
      }
    },
    [applyToken],
  )

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const apiUrl = await readApiUrl()
        const token = await registerWithPassword(name, email, password, apiUrl)
        await applyToken(token)
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Erreur d'inscription.",
        }))
      }
    },
    [applyToken],
  )

  const loginOAuth = useCallback(
    async (provider: "github" | "google") => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const apiUrl = await readApiUrl()
        // Phase initiale : deep link stayup://
        // Quand l'API supportera redirect_uri, cette URI sera passée en paramètre
        const redirectUri = AuthSession.makeRedirectUri({ scheme: "stayup", path: "auth/callback" })
        const authUrl = `${apiUrl}/auth/oauth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri)
        if (result.type === "success" && result.url) {
          const url = new URL(result.url)
          const token = url.searchParams.get("token")
          if (token) {
            await applyToken(token)
            return
          }
        }
        setState((s) => ({ ...s, loading: false }))
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Erreur OAuth.",
        }))
      }
    },
    [applyToken],
  )

  const logout = useCallback(async () => {
    await clearToken()
    setState({ session: null, loading: false, error: null })
  }, [])

  return { ...state, login, register, loginOAuth, logout }
}
