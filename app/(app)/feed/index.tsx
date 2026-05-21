import { useState, useEffect, useMemo } from "react"
import { View, Text, Pressable } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useAuth } from "@/hooks/useAuth"
import { useFeed } from "@/hooks/useFeed"
import { useLanguage } from "@/context/LanguageContext"
import { UnifiedFeedList } from "@/components/feed/UnifiedFeedList"
import { FeedFluxList } from "@/components/feed/FeedFluxList"
import { AddFluxSheet } from "@/components/feed/AddFluxSheet"
import { LoadingScreen } from "@/components/ui/LoadingScreen"
import { useSelectedFeedItemStore } from "@/store/selectedFeedItem"
import { useReadItemsStore, getTaggedItemId } from "@/store/readItems"
import type { Provider, TaggedItem } from "@/types"

type FilterMode = "all" | "unread"

export default function FeedScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const { t } = useLanguage()
  const userId = session?.userId ?? ""
  const { fluxes, connectors, loading, error, refresh } = useFeed(userId)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [filterState, setFilterState] = useState<{ providerId: Provider | null; mode: FilterMode }>(
    {
      providerId: null,
      mode: "all",
    },
  )
  const filterMode = filterState.providerId === selectedProvider ? filterState.mode : "all"
  const [addVisible, setAddVisible] = useState(false)
  const { item: openItem, setItem } = useSelectedFeedItemStore()
  const { readIds, initialized, init, markAllRead, cleanup } = useReadItemsStore()
  const openItemId = openItem ? getTaggedItemId(openItem) : null

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (!connectors || !initialized) return
    const allIds = new Set<string>([
      ...(connectors.changelog ?? []).map((item) =>
        getTaggedItemId({ provider: "changelog", item }),
      ),
      ...(connectors.youtube ?? []).map((item) => getTaggedItemId({ provider: "youtube", item })),
      ...(connectors.rss ?? []).map((item) => getTaggedItemId({ provider: "rss", item })),
      ...(connectors.scrap ?? []).map((item) => getTaggedItemId({ provider: "scrap", item })),
    ])
    void cleanup(allIds)
  }, [connectors, initialized, cleanup])

  const c = connectors ?? { changelog: [], youtube: [], rss: [], scrap: [] }

  const allTaggedItems = useMemo<TaggedItem[]>(
    () => [
      ...(c.changelog ?? []).map((item) => ({ provider: "changelog" as const, item })),
      ...(c.youtube ?? []).map((item) => ({ provider: "youtube" as const, item })),
      ...(c.rss ?? []).map((item) => ({ provider: "rss" as const, item })),
      ...(c.scrap ?? []).map((item) => ({ provider: "scrap" as const, item })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectors],
  )

  const unreadCountByRepoId = useMemo<Record<number, number>>(() => {
    const counts: Record<number, number> = {}
    for (const tagged of allTaggedItems) {
      if (!readIds.has(getTaggedItemId(tagged))) {
        const rid = tagged.item.repository_id
        counts[rid] = (counts[rid] ?? 0) + 1
      }
    }
    return counts
  }, [allTaggedItems, readIds])

  const unreadCount = useMemo(
    () => allTaggedItems.filter((t) => !readIds.has(getTaggedItemId(t))).length,
    [allTaggedItems, readIds],
  )

  function handlePressItem(tagged: TaggedItem) {
    const repoUrl =
      "repository_id" in tagged.item
        ? ((
            (fluxes ?? []).find(
              (r: { repository_id: number }) => r.repository_id === tagged.item.repository_id,
            ) as { url: string } | undefined
          )?.url ?? "")
        : ""
    setItem(tagged, repoUrl)
    router.push("/feed/detail")
  }

  if (loading && !connectors) {
    return <LoadingScreen message={t.feed.loading} />
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white dark:bg-gray-950">
        <Text className="text-sm text-red-500">{error}</Text>
        <Pressable onPress={refresh} className="rounded-lg bg-indigo-600 px-4 py-2">
          <Text className="text-white">{t.feed.retry}</Text>
        </Pressable>
      </View>
    )
  }

  const providerFiltered = selectedProvider
    ? {
        changelog: selectedProvider === "changelog" ? c.changelog : [],
        youtube: selectedProvider === "youtube" ? c.youtube : [],
        rss: selectedProvider === "rss" ? c.rss : [],
        scrap: selectedProvider === "scrap" ? c.scrap : [],
      }
    : c

  const filtered =
    filterMode === "unread"
      ? {
          changelog: (providerFiltered.changelog ?? []).filter(
            (item) => !readIds.has(`changelog:${item.id}`) || `changelog:${item.id}` === openItemId,
          ),
          youtube: (providerFiltered.youtube ?? []).filter(
            (item) => !readIds.has(`youtube:${item.id}`) || `youtube:${item.id}` === openItemId,
          ),
          rss: (providerFiltered.rss ?? []).filter(
            (item) => !readIds.has(`rss:${item.id}`) || `rss:${item.id}` === openItemId,
          ),
          scrap: (providerFiltered.scrap ?? []).filter(
            (item) => !readIds.has(`scrap:${item.id}`) || `scrap:${item.id}` === openItemId,
          ),
        }
      : providerFiltered

  const totalItems = Object.values(providerFiltered).flat().length

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={["top"]}>
      <FeedFluxList
        fluxes={fluxes}
        userId={userId}
        selectedProvider={selectedProvider}
        onSelectProvider={setSelectedProvider}
        onAddPress={() => setAddVisible(true)}
        onDeleted={refresh}
        unreadCountByRepoId={unreadCountByRepoId}
      />

      {/* Filter bar */}
      <View className="flex-row items-center gap-1 border-b border-gray-100 px-3 py-1.5 dark:border-gray-800">
        <Pressable
          onPress={() => setFilterState({ providerId: selectedProvider, mode: "all" })}
          className={`flex-row items-center gap-1.5 rounded px-2.5 py-1 ${
            filterMode === "all" ? "bg-gray-100 dark:bg-gray-800" : ""
          }`}
        >
          <Text
            className={`text-base ${
              filterMode === "all"
                ? "font-medium text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t.feed.filterAll}
          </Text>
          <View className="rounded bg-gray-200 px-1.5 py-0.5 dark:bg-gray-700">
            <Text className="text-xs font-mono text-gray-500 dark:text-gray-400">{totalItems}</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setFilterState({ providerId: selectedProvider, mode: "unread" })}
          className={`flex-row items-center gap-1.5 rounded px-2.5 py-1 ${
            filterMode === "unread" ? "bg-gray-100 dark:bg-gray-800" : ""
          }`}
        >
          <Text
            className={`text-base ${
              filterMode === "unread"
                ? "font-medium text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t.feed.filterUnread}
          </Text>
          {unreadCount > 0 && (
            <View className="rounded bg-teal-100 px-1.5 py-0.5 dark:bg-teal-900/40">
              <Text className="text-xs font-mono font-semibold text-teal-700 dark:text-teal-400">
                {unreadCount}
              </Text>
            </View>
          )}
        </Pressable>

        <View className="flex-1" />

        {unreadCount > 0 && (
          <Pressable
            onPress={() => void markAllRead(allTaggedItems)}
            className="rounded px-2.5 py-1"
          >
            <Text className="text-sm text-gray-500 dark:text-gray-400">{t.feed.markAllRead}</Text>
          </Pressable>
        )}
      </View>

      <UnifiedFeedList
        changelog={filtered.changelog ?? []}
        youtube={filtered.youtube ?? []}
        rss={filtered.rss ?? []}
        scrap={filtered.scrap ?? []}
        repositories={fluxes}
        loading={loading}
        onRefresh={refresh}
        onPressItem={handlePressItem}
        readIds={readIds}
        openItemId={openItemId ?? undefined}
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
