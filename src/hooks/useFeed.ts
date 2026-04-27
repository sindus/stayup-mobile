import { useState, useEffect, useCallback } from "react"
import { getUserFeed, type UserFeedResponse } from "@/lib/api"
import { readToken, readApiUrl } from "@/lib/store"
import { extractIdentifier } from "@/lib/utils"
import type { Provider } from "@/types"

export interface FeedFlux {
  id: string
  repository_id: number
  provider: Provider
  url: string
  identifier: string
}

interface FeedState {
  fluxes: FeedFlux[]
  connectors: UserFeedResponse["connectors"] | null
  loading: boolean
  error: string | null
}

interface UseFeed extends FeedState {
  refresh: () => void
}

export function useFeed(userId: string): UseFeed {
  const [state, setState] = useState<FeedState>({
    fluxes: [],
    connectors: null,
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
      if (!token) throw new Error("Token manquant")

      const data = await getUserFeed(userId, token, apiUrl)

      const fluxes: FeedFlux[] = data.repositories.map((r) => ({
        id: r.id,
        repository_id: r.repository_id,
        provider: r.provider,
        url: r.url,
        identifier: extractIdentifier(r.url, r.provider),
      }))

      setState({ fluxes, connectors: data.connectors, loading: false, error: null })
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Erreur de chargement.",
      }))
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refresh: load }
}
