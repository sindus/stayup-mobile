import { useCallback, useEffect, useState } from "react"
import { type AuthConfig, fetchAuthConfig } from "@/lib/api"
import { readApiUrl } from "@/lib/store"

interface UseAuthConfig {
  /** `null` until the first call has responded, or if the API does not expose
   *  `/auth/config` — the caller then falls back to default values. */
  config: AuthConfig | null
  /** The host of the currently targeted API (for display). */
  apiHost: string
  /** Call again after an API URL change. */
  refresh: () => Promise<void>
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function useAuthConfig(): UseAuthConfig {
  const [config, setConfig] = useState<AuthConfig | null>(null)
  const [apiHost, setApiHost] = useState("")

  const refresh = useCallback(() => {
    return readApiUrl().then((url) => {
      setApiHost(hostOf(url))
      return fetchAuthConfig(url).then(setConfig)
    })
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { config, apiHost, refresh }
}
