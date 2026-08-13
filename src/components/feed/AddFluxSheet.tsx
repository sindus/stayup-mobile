import { useState, useEffect } from "react"
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native"
import { X } from "lucide-react-native"
import { addUserRepository, createScrapRequest, getScrapRepos, subscribeScrap } from "@/lib/api"
import { readApiUrl, readToken } from "@/lib/store"
import { normalizeIdentifier, toRepositoryUrl } from "@/lib/utils"
import { useLanguage } from "@/context/LanguageContext"
import type { Provider, ScrapRepository } from "@/types"

type FeedProvider = "changelog" | "youtube" | "rss"

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "changelog", label: "GitHub Changelog" },
  { value: "youtube", label: "YouTube" },
  { value: "rss", label: "RSS" },
  { value: "scrap", label: "Scraping web" },
]

interface AddFluxSheetProps {
  visible: boolean
  onClose: () => void
  userId: string
  onSuccess: () => void
}

export function AddFluxSheet({ visible, onClose, userId, onSuccess }: AddFluxSheetProps) {
  const { t } = useLanguage()
  const [provider, setProvider] = useState<Provider>("changelog")
  const [identifier, setIdentifier] = useState("")
  const [scrapRepoId, setScrapRepoId] = useState<number | null>(null)
  const [scrapRepos, setScrapRepos] = useState<ScrapRepository[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scrapMode, setScrapMode] = useState<"select" | "request">("select")
  const [requestUrl, setRequestUrl] = useState("")
  const [requestSuccess, setRequestSuccess] = useState(false)

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
        const normalized = normalizeIdentifier(identifier, provider as FeedProvider)
        const url = toRepositoryUrl(normalized, provider as FeedProvider)
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={handleClose}>
        <Pressable
          className="rounded-t-2xl bg-white p-6 dark:bg-gray-900"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {t.addFlux.title}
            </Text>
            <Pressable onPress={handleClose} className="p-1">
              <X size={20} color="#9ca3af" />
            </Pressable>
          </View>

          <View className="gap-4">
            {requestSuccess ? (
              <View className="gap-2 py-2">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t.addFlux.requestSent}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {t.addFlux.requestSentDescription}
                </Text>
              </View>
            ) : (
              <>
                {/* Provider selector */}
                <View className="gap-1.5">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.addFlux.provider}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row"
                  >
                    <View className="flex-row gap-2">
                      {PROVIDERS.map(({ value, label }) => (
                        <Pressable
                          key={value}
                          onPress={() => {
                            setProvider(value)
                            setIdentifier("")
                            setScrapRepoId(null)
                            setScrapRepos(null)
                            setScrapMode("select")
                            setError(null)
                          }}
                          className={`rounded-full px-3 py-1.5 ${
                            provider === value ? "bg-indigo-600" : "bg-gray-100 dark:bg-gray-800"
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              provider === value ? "text-white" : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Identifier / scrap selector */}
                {provider === "scrap" ? (
                  <View className="gap-3">
                    {/* Mode toggle */}
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => setScrapMode("select")}
                        className={`rounded-full px-3 py-1.5 ${
                          scrapMode === "select" ? "bg-indigo-600" : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${scrapMode === "select" ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
                        >
                          {t.addFlux.chooseExisting}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setScrapMode("request")}
                        className={`rounded-full px-3 py-1.5 ${
                          scrapMode === "request" ? "bg-indigo-600" : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${scrapMode === "request" ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
                        >
                          {t.addFlux.makeRequest}
                        </Text>
                      </Pressable>
                    </View>

                    {scrapMode === "select" ? (
                      <View className="gap-1.5">
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t.addFlux.scrapRepo}
                        </Text>
                        {scrapLoading ? (
                          <ActivityIndicator size="small" />
                        ) : availableScrapRepos.length === 0 ? (
                          <Text className="text-sm text-gray-400">{t.addFlux.noScrapRepos}</Text>
                        ) : (
                          availableScrapRepos.map((r) => (
                            <Pressable
                              key={r.id}
                              onPress={() => setScrapRepoId(r.id)}
                              className={`rounded-lg border p-3 ${
                                scrapRepoId === r.id
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                  : "border-gray-200 dark:border-gray-700"
                              }`}
                            >
                              <Text
                                className="text-sm text-gray-800 dark:text-gray-200"
                                numberOfLines={1}
                              >
                                {r.url}
                              </Text>
                            </Pressable>
                          ))
                        )}
                      </View>
                    ) : (
                      <View className="gap-1.5">
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t.addFlux.requestUrl}
                        </Text>
                        <TextInput
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                          value={requestUrl}
                          onChangeText={setRequestUrl}
                          placeholder={t.addFlux.requestUrlPlaceholder}
                          placeholderTextColor="#9ca3af"
                          autoCapitalize="none"
                          keyboardType="url"
                        />
                      </View>
                    )}
                  </View>
                ) : (
                  <View className="gap-1.5">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.addFlux.identifierLabels[provider as FeedProvider]}
                    </Text>
                    <TextInput
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      value={identifier}
                      onChangeText={setIdentifier}
                      placeholder={t.addFlux.placeholders[provider as FeedProvider]}
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {error && <Text className="text-sm text-red-500">{error}</Text>}

                <View className="flex-row gap-3 pt-2">
                  <Pressable
                    onPress={handleClose}
                    className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
                  >
                    <Text className="font-medium text-gray-700 dark:text-gray-300">
                      {t.addFlux.cancel}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={submitting}
                    className="flex-1 items-center rounded-lg bg-indigo-600 py-3 disabled:opacity-50"
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="font-semibold text-white">{t.addFlux.add}</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}

            {requestSuccess && (
              <Pressable
                onPress={handleClose}
                className="items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
              >
                <Text className="font-medium text-gray-700 dark:text-gray-300">
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
