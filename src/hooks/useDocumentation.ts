import { useState, useEffect, useCallback } from "react"
import {
  getDocs,
  getDocContent,
  getDocDiff,
  getDocHistory,
  subscribeDoc,
  unsubscribeDoc,
} from "@/lib/api"
import { readApiUrl, readToken } from "@/lib/store"
import type { DocContent, DocRegistry, DocVersion } from "@/types"

interface UseDocumentationState {
  docs: DocRegistry[]
  loading: boolean
  error: string | null
}

interface UseDocumentation extends UseDocumentationState {
  refresh: () => void
  subscribe: (docId: number) => Promise<void>
  unsubscribe: (docId: number) => Promise<void>
}

export function useDocumentation(): UseDocumentation {
  const [state, setState] = useState<UseDocumentationState>({
    docs: [],
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
      if (!token) throw new Error("Token manquant")
      const docs = await getDocs(token, apiUrl)
      setState({ docs, loading: false, error: null })
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Erreur de chargement.",
      }))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function subscribe(docId: number) {
    const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
    if (!token) return
    await subscribeDoc(docId, token, apiUrl)
    setState((s) => ({
      ...s,
      docs: s.docs.map((d) => (d.id === docId ? { ...d, is_subscribed: true } : d)),
    }))
  }

  async function unsubscribe(docId: number) {
    const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
    if (!token) return
    await unsubscribeDoc(docId, token, apiUrl)
    setState((s) => ({
      ...s,
      docs: s.docs.map((d) => (d.id === docId ? { ...d, is_subscribed: false } : d)),
    }))
  }

  return { ...state, refresh: load, subscribe, unsubscribe }
}

interface UseDocContentState {
  doc: DocRegistry | null
  current: DocContent | null
  loading: boolean
  error: string | null
}

export function useDocContent(docId: number): UseDocContentState {
  const [state, setState] = useState<UseDocContentState>({
    doc: null,
    current: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    setState({ doc: null, current: null, loading: true, error: null })

    async function load() {
      try {
        const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
        if (!token) throw new Error("Token manquant")
        const data = await getDocContent(docId, token, apiUrl)
        if (!cancelled)
          setState({ doc: data.doc, current: data.current, loading: false, error: null })
      } catch (err) {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : "Erreur de chargement.",
          }))
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [docId])

  return state
}

interface UseDocHistoryState {
  docName: string
  versions: DocVersion[]
  loading: boolean
  error: string | null
}

export function useDocHistory(docId: number): UseDocHistoryState {
  const [state, setState] = useState<UseDocHistoryState>({
    docName: "",
    versions: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    setState({ docName: "", versions: [], loading: true, error: null })

    async function load() {
      try {
        const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
        if (!token) throw new Error("Token manquant")
        const [contentData, versions] = await Promise.all([
          getDocContent(docId, token, apiUrl),
          getDocHistory(docId, token, apiUrl),
        ])
        if (!cancelled)
          setState({ docName: contentData.doc.name, versions, loading: false, error: null })
      } catch (err) {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : "Erreur de chargement.",
          }))
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [docId])

  return state
}

interface UseDocDiffState {
  docName: string
  version: number | null
  diff: string | null
  scraped_at: string | null
  loading: boolean
  error: string | null
}

export function useDocDiff(docId: number, versionId: number): UseDocDiffState {
  const [state, setState] = useState<UseDocDiffState>({
    docName: "",
    version: null,
    diff: null,
    scraped_at: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    setState({
      docName: "",
      version: null,
      diff: null,
      scraped_at: null,
      loading: true,
      error: null,
    })

    async function load() {
      try {
        const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
        if (!token) throw new Error("Token manquant")
        const [contentData, diffData] = await Promise.all([
          getDocContent(docId, token, apiUrl),
          getDocDiff(docId, versionId, token, apiUrl),
        ])
        if (!cancelled)
          setState({
            docName: contentData.doc.name,
            version: diffData.version,
            diff: diffData.diff,
            scraped_at: diffData.scraped_at,
            loading: false,
            error: null,
          })
      } catch (err) {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : "Erreur de chargement.",
          }))
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [docId, versionId])

  return state
}
