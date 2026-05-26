import { useState, useEffect, useMemo } from "react"
import { View, Text, Pressable, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Plus, SlidersHorizontal, CheckCheck } from "lucide-react-native"
import { useAuth } from "@/hooks/useAuth"
import { useFeed } from "@/hooks/useFeed"
import { UnifiedFeedList } from "@/components/feed/UnifiedFeedList"
import { FeedFluxList } from "@/components/feed/FeedFluxList"
import { AddFluxSheet } from "@/components/feed/AddFluxSheet"
import { LoadingScreen } from "@/components/ui/LoadingScreen"
import { useReadItemsStore, getTaggedItemId } from "@/store/readItems"
import { useLanguage } from "@/context/LanguageContext"
import type { Provider, TaggedItem } from "@/types"

const PROVIDER_COLORS: Record<Provider, string> = {
  changelog: "#14b8a6",
  youtube: "#f43f5e",
  rss: "#f59e0b",
  scrap: "#22c55e",
}

type FilterMode = "all" | "unread"

export default function FeedScreen() {
  const { session } = useAuth()
  const { t } = useLanguage()
  const userId = session?.userId ?? ""
  const { fluxes, connectors, loading, error, refresh } = useFeed(userId)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [addVisible, setAddVisible] = useState(false)
  const [manageVisible, setManageVisible] = useState(false)

  const { readIds, initialized, init, markRead, markAllRead, cleanup } = useReadItemsStore()

  useEffect(() => {
    void init()
  }, [init])

  const c = connectors ?? { changelog: [], youtube: [], rss: [], scrap: [] }

  const filtered = selectedProvider
    ? {
        changelog: selectedProvider === "changelog" ? c.changelog : [],
        youtube: selectedProvider === "youtube" ? c.youtube : [],
        rss: selectedProvider === "rss" ? c.rss : [],
        scrap: selectedProvider === "scrap" ? c.scrap : [],
      }
    : c

  // All items sorted for unread count calculations
  const allTagged = useMemo<TaggedItem[]>(() => [
    ...(c.changelog ?? []).map((item) => ({ provider: "changelog" as const, item })),
    ...(c.youtube ?? []).map((item) => ({ provider: "youtube" as const, item })),
    ...(c.rss ?? []).map((item) => ({ provider: "rss" as const, item })),
    ...(c.scrap ?? []).map((item) => ({ provider: "scrap" as const, item })),
  ], [c.changelog, c.youtube, c.rss, c.scrap])

  // Cleanup stale read IDs when feed is loaded
  useEffect(() => {
    if (!initialized || allTagged.length === 0) return
    const currentIds = new Set(allTagged.map(getTaggedItemId))
    void cleanup(currentIds)
  }, [initialized, allTagged, cleanup])

  // Unread count per provider
  const unreadByProvider = useMemo<Partial<Record<Provider, number>>>(() => {
    const counts: Partial<Record<Provider, number>> = {}
    for (const tagged of allTagged) {
      if (!readIds.has(getTaggedItemId(tagged))) {
        counts[tagged.provider] = (counts[tagged.provider] ?? 0) + 1
      }
    }
    return counts
  }, [allTagged, readIds])

  const totalUnread = useMemo(
    () => allTagged.filter((t) => !readIds.has(getTaggedItemId(t))).length,
    [allTagged, readIds],
  )

  const providers: Provider[] = (["changelog", "youtube", "rss", "scrap"] as Provider[]).filter(
    (p) => fluxes.some((f) => f.provider === p),
  )

  if (loading && !connectors) return <LoadingScreen message="Chargement du feed…" />

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white dark:bg-gray-950">
        <Text className="text-sm text-red-500">{error}</Text>
        <Pressable onPress={refresh} className="rounded-lg bg-indigo-600 px-4 py-2">
          <Text className="text-white">Réessayer</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Feed</Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setManageVisible(true)}
            className="rounded-full bg-gray-100 p-2 dark:bg-gray-800"
            hitSlop={8}
          >
            <SlidersHorizontal size={18} color="#6366f1" />
          </Pressable>
          <Pressable
            onPress={() => setAddVisible(true)}
            className="rounded-full bg-indigo-600 p-2"
            hitSlop={8}
          >
            <Plus size={18} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Filtre lu / non-lu */}
      <View className="flex-row items-center gap-2 px-4 pb-2">
        <Pressable
          onPress={() => setFilterMode("all")}
          className={`rounded-full px-3 py-1.5 ${filterMode === "all" ? "bg-gray-900 dark:bg-white" : "bg-gray-100 dark:bg-gray-800"}`}
        >
          <Text className={`text-sm font-medium ${filterMode === "all" ? "text-white dark:text-gray-900" : "text-gray-700 dark:text-gray-300"}`}>
            {t.feed.allFeeds}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilterMode("unread")}
          className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${filterMode === "unread" ? "bg-gray-900 dark:bg-white" : "bg-gray-100 dark:bg-gray-800"}`}
        >
          <Text className={`text-sm font-medium ${filterMode === "unread" ? "text-white dark:text-gray-900" : "text-gray-700 dark:text-gray-300"}`}>
            Non lus
          </Text>
          {totalUnread > 0 && (
            <View className="rounded-full bg-indigo-600 px-1.5 py-0.5">
              <Text className="text-xs font-bold text-white">{totalUnread}</Text>
            </View>
          )}
        </Pressable>

        {totalUnread > 0 && (
          <Pressable
            onPress={() => void markAllRead(allTagged)}
            className="ml-auto rounded-full bg-gray-100 p-2 dark:bg-gray-800"
            hitSlop={8}
          >
            <CheckCheck size={16} color="#6366f1" />
          </Pressable>
        )}
      </View>

      {/* Provider chips avec badges non-lus */}
      {providers.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-row gap-2 px-4 pb-3"
        >
          <Pressable
            onPress={() => setSelectedProvider(null)}
            className={`rounded-full px-3 py-1.5 ${selectedProvider === null ? "bg-indigo-600" : "bg-gray-100 dark:bg-gray-800"}`}
          >
            <Text className={`text-sm font-medium ${selectedProvider === null ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
              Tous
            </Text>
          </Pressable>
          {providers.map((p) => {
            const unread = unreadByProvider[p] ?? 0
            return (
              <Pressable
                key={p}
                onPress={() => setSelectedProvider(selectedProvider === p ? null : p)}
                className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${selectedProvider === p ? "bg-indigo-600" : "bg-gray-100 dark:bg-gray-800"}`}
              >
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[p] }} />
                <Text className={`text-sm font-medium ${selectedProvider === p ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
                  {t.feed.providers[p]}
                </Text>
                {unread > 0 && (
                  <View className="rounded-full bg-indigo-600 px-1.5 py-0.5">
                    <Text className="text-xs font-bold text-white">{unread}</Text>
                  </View>
                )}
              </Pressable>
            )
          })}
        </ScrollView>
      )}

      <UnifiedFeedList
        changelog={filtered.changelog ?? []}
        youtube={filtered.youtube ?? []}
        rss={filtered.rss ?? []}
        scrap={filtered.scrap ?? []}
        repositories={fluxes}
        loading={loading}
        onRefresh={refresh}
        readIds={readIds}
        filterMode={filterMode}
        onMarkRead={markRead}
      />

      <FeedFluxList
        visible={manageVisible}
        onClose={() => setManageVisible(false)}
        fluxes={fluxes}
        userId={userId}
        onDeleted={refresh}
      />

      <AddFluxSheet
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        userId={userId}
        onSuccess={refresh}
      />
    </SafeAreaView>
  )
}
