import { FlatList, View, Text, Pressable, RefreshControl } from "react-native"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import type {
  ChangelogItem,
  YoutubeItem,
  YoutubeItemContent,
  RssItem,
  RssItemContent,
  ScrapItem,
  ScrapItemParams,
  TaggedItem,
} from "@/types"
import { formatDate, stripHtml, stripMarkdown } from "@/lib/utils"
import { useFeedReaderStore, type FeedArticle } from "@/store/feedReader"
import { getTaggedItemId } from "@/store/readItems"

function getItemDate(tagged: TaggedItem): string {
  const item = tagged.item
  if ("datetime" in item && item.datetime) return item.datetime
  return item.executed_at
}

function toArticle(tagged: TaggedItem, repoUrlMap: Record<number, string>): FeedArticle {
  if (tagged.provider === "changelog") {
    const item = tagged.item
    const repoUrl = repoUrlMap[item.repository_id] ?? ""
    const repoName = repoUrl.replace("https://github.com/", "") || "repository"
    return {
      title: `${item.version} — ${repoName}`,
      url: repoUrl ? `${repoUrl}/releases/tag/${item.version}` : undefined,
      content: item.content ? stripMarkdown(item.content) : undefined,
      provider: "changelog",
      date: formatDate(item.datetime ?? item.executed_at),
    }
  }
  if (tagged.provider === "youtube") {
    let parsed: YoutubeItemContent | null = null
    try {
      parsed = JSON.parse(tagged.item.content) as YoutubeItemContent
    } catch {}
    return {
      title: parsed?.title ?? "Sans titre",
      url: parsed?.link ?? parsed?.url,
      thumbnail: parsed?.thumbnail,
      provider: "youtube",
      date: formatDate(tagged.item.datetime ?? tagged.item.executed_at),
    }
  }
  if (tagged.provider === "rss") {
    let parsed: RssItemContent | null = null
    try {
      parsed = JSON.parse(tagged.item.content) as RssItemContent
    } catch {}
    return {
      title: parsed?.title ?? "Sans titre",
      url: parsed?.link ?? undefined,
      content: parsed?.summary ? stripHtml(parsed.summary) : undefined,
      provider: "rss",
      date: formatDate(tagged.item.datetime ?? tagged.item.executed_at),
    }
  }
  const params: ScrapItemParams | null =
    typeof tagged.item.params === "string"
      ? (() => {
          try {
            return JSON.parse(tagged.item.params) as ScrapItemParams
          } catch {
            return null
          }
        })()
      : (tagged.item.params as ScrapItemParams | null)
  return {
    title: params?.url ?? "Page web",
    url: params?.url,
    content: tagged.item.content ? stripHtml(tagged.item.content) : undefined,
    provider: "scrap",
    date: formatDate(tagged.item.executed_at),
  }
}

interface UnifiedFeedListProps {
  changelog: ChangelogItem[]
  youtube: YoutubeItem[]
  rss: RssItem[]
  scrap: ScrapItem[]
  repositories?: { repository_id: number; url: string }[]
  loading?: boolean
  onRefresh?: () => void
  readIds: Set<string>
  filterMode: "all" | "unread"
  onMarkRead: (tagged: TaggedItem) => void
}

export function UnifiedFeedList({
  changelog,
  youtube,
  rss,
  scrap,
  repositories = [],
  loading,
  onRefresh,
  readIds,
  filterMode,
  onMarkRead,
}: UnifiedFeedListProps) {
  const router = useRouter()
  const { open } = useFeedReaderStore()
  const repoUrlMap = Object.fromEntries(repositories.map((r) => [r.repository_id, r.url]))

  const sorted: TaggedItem[] = [
    ...changelog.map((item) => ({ provider: "changelog" as const, item })),
    ...youtube.map((item) => ({ provider: "youtube" as const, item })),
    ...rss.map((item) => ({ provider: "rss" as const, item })),
    ...scrap.map((item) => ({ provider: "scrap" as const, item })),
  ].sort((a, b) => new Date(getItemDate(b)).getTime() - new Date(getItemDate(a)).getTime())

  const visible =
    filterMode === "unread"
      ? sorted.filter((item) => !readIds.has(getTaggedItemId(item)))
      : sorted

  const articles = sorted.map((tagged) => toArticle(tagged, repoUrlMap))

  function handlePress(tagged: TaggedItem, sortedIndex: number) {
    onMarkRead(tagged)
    open(articles, sortedIndex)
    router.push("/(app)/feed/article")
  }

  if (visible.length === 0 && !loading) {
    return (
      <View className="flex-1 items-center justify-center py-16">
        <Text className="text-sm italic text-gray-400">
          {filterMode === "unread" ? "Aucun article non lu." : "Aucun contenu disponible."}
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={visible}
      keyExtractor={(tagged) => getTaggedItemId(tagged)}
      style={{ flex: 1 }}
      renderItem={({ item: tagged }) => {
        const sortedIndex = sorted.indexOf(tagged)
        const isRead = readIds.has(getTaggedItemId(tagged))
        return (
          <Pressable
            onPress={() => handlePress(tagged, sortedIndex)}
            className="border-b border-gray-100 px-4 py-3 active:bg-gray-50 dark:border-gray-800 dark:active:bg-gray-900"
            style={{ opacity: isRead ? 0.45 : 1 }}
          >
            {tagged.provider === "changelog" && (
              <ChangelogEntry item={tagged.item} repoUrl={repoUrlMap[tagged.item.repository_id] ?? ""} />
            )}
            {tagged.provider === "youtube" && <YoutubeEntry item={tagged.item} />}
            {tagged.provider === "rss" && <RssEntry item={tagged.item} />}
            {tagged.provider === "scrap" && <ScrapEntry item={tagged.item} />}
          </Pressable>
        )
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!loading} onRefresh={onRefresh} />
        ) : undefined
      }
    />
  )
}

function ChangelogEntry({ item, repoUrl }: { item: ChangelogItem; repoUrl: string }) {
  const repoName = repoUrl?.replace("https://github.com/", "") ?? "repository"

  return (
    <View className="border-l-2 border-teal-400 pl-3 py-1">
      <View className="mb-1 flex-row items-center gap-2">
        <Text className="flex-1 text-xs font-mono text-gray-500 dark:text-gray-400" numberOfLines={1}>
          {repoName}
        </Text>
        <View className="rounded bg-teal-50 px-1.5 py-0.5 dark:bg-teal-900/30">
          <Text className="text-xs font-mono font-semibold text-teal-700 dark:text-teal-400">
            {item.version}
          </Text>
        </View>
        {item.datetime && (
          <Text className="text-xs font-mono text-gray-400 dark:text-gray-500">
            {formatDate(item.datetime)}
          </Text>
        )}
      </View>
      {item.content && (
        <Text className="text-sm leading-relaxed text-gray-600 dark:text-gray-400" numberOfLines={2}>
          {stripHtml(item.content).slice(0, 200)}
        </Text>
      )}
    </View>
  )
}

function YoutubeEntry({ item }: { item: YoutubeItem }) {
  let parsed: YoutubeItemContent | null = null
  try {
    parsed = JSON.parse(item.content) as YoutubeItemContent
  } catch {}

  return (
    <View className="flex-row gap-3">
      <View className="h-14 w-24 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
        {parsed?.thumbnail ? (
          <Image
            source={{ uri: parsed.thumbnail }}
            style={{ width: 96, height: 56 }}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-xs text-gray-400">▶</Text>
          </View>
        )}
      </View>
      <View className="flex-1">
        <Text
          className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100"
          numberOfLines={2}
        >
          {parsed?.title ?? "Sans titre"}
        </Text>
        <Text className="mt-1 text-xs font-mono text-gray-400">
          {formatDate(item.datetime ?? item.executed_at)}
        </Text>
      </View>
    </View>
  )
}

function RssEntry({ item }: { item: RssItem }) {
  let parsed: RssItemContent | null = null
  try {
    parsed = JSON.parse(item.content) as RssItemContent
  } catch {}

  return (
    <View className="border-l-2 border-amber-400 pl-3 py-1">
      <View className="mb-1 flex-row items-center justify-between gap-2">
        <Text
          className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100"
          numberOfLines={1}
        >
          {parsed?.title ?? "Sans titre"}
        </Text>
        {item.datetime && (
          <Text className="text-xs font-mono text-gray-400">{formatDate(item.datetime)}</Text>
        )}
      </View>
      {parsed?.summary && (
        <Text className="text-sm leading-relaxed text-gray-600 dark:text-gray-400" numberOfLines={2}>
          {stripHtml(parsed.summary)}
        </Text>
      )}
    </View>
  )
}

function ScrapEntry({ item }: { item: ScrapItem }) {
  const params: ScrapItemParams | null =
    typeof item.params === "string"
      ? (() => {
          try {
            return JSON.parse(item.params) as ScrapItemParams
          } catch {
            return null
          }
        })()
      : (item.params as ScrapItemParams | null)

  return (
    <View className="border-l-2 border-green-400 pl-3 py-1">
      <View className="mb-1 flex-row items-center justify-between gap-2">
        {params?.url && (
          <Text
            className="flex-1 text-xs font-mono text-gray-500 dark:text-gray-400"
            numberOfLines={1}
          >
            {params.url}
          </Text>
        )}
        <Text className="text-xs font-mono text-gray-400">{formatDate(item.executed_at)}</Text>
      </View>
      {item.content && (
        <Text className="text-sm leading-relaxed text-gray-600 dark:text-gray-400" numberOfLines={2}>
          {stripHtml(item.content).slice(0, 200)}
        </Text>
      )}
    </View>
  )
}
