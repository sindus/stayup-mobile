import { useState, useEffect, useMemo } from "react"
import { View, Text, Pressable } from "react-native"
import { CheckCheck } from "lucide-react-native"
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
import { colors } from "@/theme"
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
      <View className="flex-1 items-center justify-center gap-3 bg-bg">
        <Text className="text-sm text-rose">{error}</Text>
        <Pressable onPress={refresh} className="rounded-xl bg-peach px-4 py-2.5">
          <Text className="font-semibold text-peach-on">{t.feed.retry}</Text>
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
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <FeedFluxList
        fluxes={fluxes}
        userId={userId}
        selectedProvider={selectedProvider}
        onSelectProvider={setSelectedProvider}
        onAddPress={() => setAddVisible(true)}
        onDeleted={refresh}
        onImported={refresh}
        unreadCountByRepoId={unreadCountByRepoId}
      />

      {/* Filter bar */}
      <View
        className="flex-row items-center gap-1 border-b px-3 py-1.5"
        style={{ borderColor: colors.borderSoft }}
      >
        <Pressable
          onPress={() => setFilterState({ providerId: selectedProvider, mode: "all" })}
          className="flex-row items-center gap-1.5 rounded-md px-2.5 py-1"
          style={filterMode === "all" ? { backgroundColor: colors.surface } : undefined}
        >
          <Text
            className="text-[15px]"
            style={{ color: filterMode === "all" ? colors.fg : colors.muted }}
          >
            {t.feed.filterAll}
          </Text>
          <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: colors.surfaceHi }}>
            <Text className="text-xs font-mono" style={{ color: colors.dim }}>
              {totalItems}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setFilterState({ providerId: selectedProvider, mode: "unread" })}
          className="flex-row items-center gap-1.5 rounded-md px-2.5 py-1"
          style={filterMode === "unread" ? { backgroundColor: colors.surface } : undefined}
        >
          <Text
            className="text-[15px]"
            style={{ color: filterMode === "unread" ? colors.fg : colors.muted }}
          >
            {t.feed.filterUnread}
          </Text>
          {unreadCount > 0 && (
            <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: colors.peachDim }}>
              <Text className="text-xs font-mono font-semibold" style={{ color: colors.peach }}>
                {unreadCount}
              </Text>
            </View>
          )}
        </Pressable>

        <View className="flex-1" />

        {unreadCount > 0 && (
          <Pressable
            onPress={() => void markAllRead(allTaggedItems)}
            accessibilityLabel={t.feed.markAllRead}
            className="rounded p-1.5"
          >
            <CheckCheck size={18} color={colors.muted} />
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
