import { useState, useEffect } from "react"
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator } from "react-native"
import { X } from "lucide-react-native"
import {
  addUserRepository,
  createScrapRequest,
  getConnectorProviders,
  getScrapRepos,
  subscribeScrap,
} from "@/lib/api"
import { readApiUrl, readToken } from "@/lib/store"
import { normalizeIdentifier, toRepositoryUrl } from "@/lib/utils"
import { useLanguage } from "@/context/LanguageContext"
import { colors, getProviderMeta } from "@/theme"
import { isKnownProvider, type KnownProvider } from "@/types"
import type { ScrapRepository } from "@/types"

type FeedProvider = Exclude<KnownProvider, "scrap">

interface ProviderTile {
  id: string
  label: string
  color: string
  dim: string
}

interface AddFluxSheetProps {
  visible: boolean
  onClose: () => void
  userId: string
  onSuccess: () => void
}

export function AddFluxSheet({ visible, onClose, userId, onSuccess }: AddFluxSheetProps) {
  const { t } = useLanguage()
  const [provider, setProvider] = useState<string>("changelog")
  const [identifier, setIdentifier] = useState("")
  const [scrapRepoId, setScrapRepoId] = useState<number | null>(null)
  const [scrapRepos, setScrapRepos] = useState<ScrapRepository[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scrapMode, setScrapMode] = useState<"select" | "request">("select")
  const [requestUrl, setRequestUrl] = useState("")
  const [requestSuccess, setRequestSuccess] = useState(false)
  const [tiles, setTiles] = useState<ProviderTile[]>([])

  // Liste des providers dynamique : vient de l'API, aucun nom n'est codé en dur ici.
  useEffect(() => {
    if (!visible) return
    let cancelled = false
    Promise.all([readToken(), readApiUrl()])
      .then(([token, apiUrl]) => getConnectorProviders(token ?? "", apiUrl))
      .then((providers) => {
        if (cancelled) return
        setTiles(
          providers.map(({ name, displayName }) => {
            const meta = getProviderMeta(name)
            const label = isKnownProvider(name) ? t.feed.providers[name] : displayName
            return { id: name, label, color: meta.color, dim: meta.dim }
          }),
        )
      })
      .catch(() => {
        if (!cancelled) setTiles([])
      })
    return () => {
      cancelled = true
    }
  }, [visible, t])

  useEffect(() => {
    if (provider !== "scrap") return
    let cancelled = false
    Promise.all([readToken(), readApiUrl()])
      .then(([token, apiUrl]) => {
        if (cancelled || !token) return []
        return getScrapRepos(token, apiUrl)
      })
      .then((repos) => {
        if (!cancelled) setScrapRepos(repos ?? [])
      })
      .catch(() => {
        if (!cancelled) setScrapRepos([])
      })
    return () => {
      cancelled = true
    }
  }, [provider])

  function handleClose() {
    setProvider("changelog")
    setIdentifier("")
    setScrapRepoId(null)
    setScrapRepos(null)
    setError(null)
    setScrapMode("select")
    setRequestUrl("")
    setRequestSuccess(false)
    onClose()
  }

  async function handleSubmit() {
    setError(null)

    if (provider === "scrap" && scrapMode === "request") {
      if (!requestUrl.trim()) {
        setError(t.addFlux.requiredError)
        return
      }
      try {
        new URL(requestUrl)
      } catch {
        setError(t.addFlux.requestUrlError)
        return
      }
      setSubmitting(true)
      try {
        const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
        if (!token) throw new Error("Token manquant")
        await createScrapRequest({ url: requestUrl }, token, apiUrl)
        setRequestSuccess(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : t.common.error)
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (provider === "scrap") {
      if (!scrapRepoId) {
        setError(t.addFlux.selectError)
        return
      }
    } else {
      if (!identifier.trim()) {
        setError(t.addFlux.requiredError)
        return
      }
    }

    setSubmitting(true)
    try {
      const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
      if (!token) throw new Error("Token manquant")

      if (provider === "scrap") {
        await subscribeScrap(scrapRepoId!, token, apiUrl)
      } else {
        const normalized = normalizeIdentifier(identifier, provider)
        const url = toRepositoryUrl(normalized, provider)
        await addUserRepository(userId, token, apiUrl, {
          provider,
          url,
          config: { max_scraps: 5, retention_days: 15 },
        })
      }
      onSuccess()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error)
    } finally {
      setSubmitting(false)
    }
  }

  const scrapLoading = provider === "scrap" && scrapRepos === null
  const availableScrapRepos = (scrapRepos ?? []).filter((r) => !r.is_subscribed)
  const isKnownFeedProvider =
    provider === "changelog" || provider === "youtube" || provider === "rss"
  const inputStyle = {
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.fg,
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(8,10,16,0.72)" }}
        onPress={handleClose}
      >
        <Pressable
          className="rounded-t-[24px] p-6"
          style={{ backgroundColor: colors.surface, paddingBottom: 34 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            className="self-center mb-4 h-1 w-10 rounded-full"
            style={{ backgroundColor: colors.border }}
          />
          <View className="flex-row items-start justify-between mb-1">
            <Text
              style={{ fontFamily: "InstrumentSerif", fontSize: 24, color: colors.fg, flex: 1 }}
            >
              {t.addFlux.title}
            </Text>
            <Pressable onPress={handleClose} className="p-1 -mr-1 -mt-1">
              <X size={20} color={colors.muted} />
            </Pressable>
          </View>
          {!requestSuccess && (
            <Text className="mb-4 text-[13px]" style={{ color: colors.muted }}>
              {t.addFlux.description}
            </Text>
          )}

          <View className="gap-4">
            {requestSuccess ? (
              <View className="gap-2 py-2">
                <Text className="text-sm font-semibold" style={{ color: colors.fg }}>
                  {t.addFlux.requestSent}
                </Text>
                <Text className="text-sm" style={{ color: colors.muted }}>
                  {t.addFlux.requestSentDescription}
                </Text>
              </View>
            ) : (
              <>
                {/* Provider selector — 2x2 grid */}
                <View className="gap-1.5">
                  <Text className="text-[11px] font-medium" style={{ color: colors.fgSoft }}>
                    {t.addFlux.provider}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {tiles.map((tile) => {
                      const active = provider === tile.id
                      return (
                        <Pressable
                          key={tile.id}
                          onPress={() => {
                            setProvider(tile.id)
                            setIdentifier("")
                            setScrapRepoId(null)
                            setScrapRepos(null)
                            setScrapMode("select")
                            setError(null)
                          }}
                          className="rounded-xl px-3.5 py-2.5 border"
                          style={{
                            width: "47%",
                            backgroundColor: active ? tile.dim : colors.bg,
                            borderColor: active ? tile.color : colors.border,
                          }}
                        >
                          <Text
                            className="text-[13.5px] font-medium"
                            style={{ color: active ? tile.color : colors.fgSoft }}
                          >
                            {tile.label}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>

                {/* Identifier / scrap selector */}
                {provider === "scrap" ? (
                  <View className="gap-3">
                    {/* Mode toggle */}
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => setScrapMode("select")}
                        className="rounded-full px-3 py-1.5"
                        style={{
                          backgroundColor: scrapMode === "select" ? colors.peach : colors.bg,
                        }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: scrapMode === "select" ? colors.peachOn : colors.fgSoft }}
                        >
                          {t.addFlux.chooseExisting}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setScrapMode("request")}
                        className="rounded-full px-3 py-1.5"
                        style={{
                          backgroundColor: scrapMode === "request" ? colors.peach : colors.bg,
                        }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{
                            color: scrapMode === "request" ? colors.peachOn : colors.fgSoft,
                          }}
                        >
                          {t.addFlux.makeRequest}
                        </Text>
                      </Pressable>
                    </View>

                    {scrapMode === "select" ? (
                      <View className="gap-1.5">
                        <Text className="text-[11px] font-medium" style={{ color: colors.fgSoft }}>
                          {t.addFlux.scrapRepo}
                        </Text>
                        {scrapLoading ? (
                          <ActivityIndicator size="small" color={colors.peach} />
                        ) : availableScrapRepos.length === 0 ? (
                          <Text className="text-sm" style={{ color: colors.dim }}>
                            {t.addFlux.noScrapRepos}
                          </Text>
                        ) : (
                          availableScrapRepos.map((r) => {
                            const active = scrapRepoId === r.id
                            return (
                              <Pressable
                                key={r.id}
                                onPress={() => setScrapRepoId(r.id)}
                                className="rounded-xl border p-3"
                                style={{
                                  borderColor: active ? colors.peach : colors.border,
                                  backgroundColor: active ? colors.peachDim : "transparent",
                                }}
                              >
                                <Text
                                  className="text-sm font-mono"
                                  style={{ color: colors.fgSoft }}
                                  numberOfLines={1}
                                >
                                  {r.url}
                                </Text>
                              </Pressable>
                            )
                          })
                        )}
                      </View>
                    ) : (
                      <View className="gap-1.5">
                        <Text className="text-[11px] font-medium" style={{ color: colors.fgSoft }}>
                          {t.addFlux.requestUrl}
                        </Text>
                        <TextInput
                          className="rounded-xl border px-3.5 py-3"
                          style={inputStyle}
                          value={requestUrl}
                          onChangeText={setRequestUrl}
                          placeholder={t.addFlux.requestUrlPlaceholder}
                          placeholderTextColor={colors.dim}
                          autoCapitalize="none"
                          keyboardType="url"
                        />
                      </View>
                    )}
                  </View>
                ) : (
                  <View className="gap-1.5">
                    <Text className="text-[11px] font-medium" style={{ color: colors.fgSoft }}>
                      {isKnownFeedProvider
                        ? t.addFlux.identifierLabels[provider as FeedProvider]
                        : t.addFlux.identifierLabels.generic}
                    </Text>
                    <TextInput
                      className="rounded-xl border px-3.5 py-3"
                      style={inputStyle}
                      value={identifier}
                      onChangeText={setIdentifier}
                      placeholder={
                        isKnownFeedProvider
                          ? t.addFlux.placeholders[provider as FeedProvider]
                          : t.addFlux.placeholders.generic
                      }
                      placeholderTextColor={colors.dim}
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {error && (
                  <Text className="text-sm" style={{ color: colors.rose }}>
                    {error}
                  </Text>
                )}

                <View className="flex-row gap-3 pt-2">
                  <Pressable
                    onPress={handleClose}
                    className="flex-1 items-center rounded-xl border py-3"
                    style={{ borderColor: colors.border }}
                  >
                    <Text className="font-medium" style={{ color: colors.fgSoft }}>
                      {t.addFlux.cancel}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={submitting}
                    className="flex-1 items-center rounded-xl py-3 disabled:opacity-50"
                    style={{ backgroundColor: colors.peach }}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={colors.peachOn} />
                    ) : (
                      <Text className="font-semibold" style={{ color: colors.peachOn }}>
                        {t.addFlux.add}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}

            {requestSuccess && (
              <Pressable
                onPress={handleClose}
                className="items-center rounded-xl border py-3"
                style={{ borderColor: colors.border }}
              >
                <Text className="font-medium" style={{ color: colors.fgSoft }}>
                  {t.addFlux.cancel}
                </Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
