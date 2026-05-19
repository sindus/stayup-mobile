import { useState, useEffect } from "react"
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

export default function FeedScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const { t } = useLanguage()
  const userId = session?.userId ?? ""
  const { fluxes, connectors, loading, error, refresh } = useFeed(userId)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [addVisible, setAddVisible] = useState(false)
  const setItem = useSelectedFeedItemStore((s) => s.setItem)
  const { readIds, initialized, init, markRead, cleanup } = useReadItemsStore()

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

  function handlePressItem(tagged: TaggedItem) {
    const repoUrl =
      "repository_id" in tagged.item
        ? ((
            (fluxes ?? []).find(
              (r: { repository_id: number }) => r.repository_id === tagged.item.repository_id,
            ) as { url: string } | undefined
          )?.url ?? "")
        : ""
    void markRead(tagged)
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

  const c = connectors ?? { changelog: [], youtube: [], rss: [], scrap: [] }

  const filtered = selectedProvider
    ? {
        changelog: selectedProvider === "changelog" ? c.changelog : [],
        youtube: selectedProvider === "youtube" ? c.youtube : [],
        rss: selectedProvider === "rss" ? c.rss : [],
        scrap: selectedProvider === "scrap" ? c.scrap : [],
      }
    : c

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={["top"]}>
      <FeedFluxList
        fluxes={fluxes}
        userId={userId}
        selectedProvider={selectedProvider}
        onSelectProvider={setSelectedProvider}
        onAddPress={() => setAddVisible(true)}
        onDeleted={refresh}
      />

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
