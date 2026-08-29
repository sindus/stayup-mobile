import { useCallback, useEffect, useState } from "react"
import { type AuthConfig, fetchAuthConfig } from "@/lib/api"
import { readApiUrl } from "@/lib/store"

interface UseAuthConfig {
  /** `null` tant que le premier appel n'a pas répondu, ou si l'API n'expose
   *  pas `/auth/config` — l'appelant retombe alors sur des valeurs par défaut. */
  config: AuthConfig | null
  /** L'hôte de l'API actuellement visée (pour l'afficher). */
  apiHost: string
  /** À rappeler après un changement d'URL d'API. */
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
