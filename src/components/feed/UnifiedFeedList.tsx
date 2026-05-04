import { FlatList, View, Text, Pressable, RefreshControl } from "react-native"
import { Image } from "expo-image"
import type {
  ChangelogItem,
  YoutubeItem,
  YoutubeItemContent,
  RssItem,
  RssItemContent,
  ScrapItem,
  ScrapItemParams,
} from "@/types"
import { formatDate, openUrl } from "@/lib/utils"

type TaggedItem =
  | { provider: "changelog"; item: ChangelogItem }
  | { provider: "youtube"; item: YoutubeItem }
  | { provider: "rss"; item: RssItem }
  | { provider: "scrap"; item: ScrapItem }

function getItemDate(tagged: TaggedItem): string {
  const item = tagged.item
  if ("datetime" in item && item.datetime) return item.datetime
  return item.executed_at
}

interface UnifiedFeedListProps {
  changelog: ChangelogItem[]
  youtube: YoutubeItem[]
  rss: RssItem[]
  scrap: ScrapItem[]
  repositories?: { repository_id: number; url: string }[]
  loading?: boolean
  onRefresh?: () => void
}

export function UnifiedFeedList({
  changelog,
  youtube,
  rss,
  scrap,
  repositories = [],
  loading,
  onRefresh,
}: UnifiedFeedListProps) {
  const repoUrlMap = Object.fromEntries(repositories.map((r) => [r.repository_id, r.url]))

  const all: TaggedItem[] = [
    ...changelog.map((item) => ({ provider: "changelog" as const, item })),
    ...youtube.map((item) => ({ provider: "youtube" as const, item })),
    ...rss.map((item) => ({ provider: "rss" as const, item })),
    ...scrap.map((item) => ({ provider: "scrap" as const, item })),
  ].sort((a, b) => new Date(getItemDate(b)).getTime() - new Date(getItemDate(a)).getTime())

  if (all.length === 0 && !loading) {
    return (
      <View className="flex-1 items-center justify-center py-16">
        <Text className="text-sm italic text-gray-400">Aucun contenu disponible.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={all}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item: tagged }) => (
        <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          {tagged.provider === "changelog" && (
            <ChangelogEntry
              item={tagged.item}
              repoUrl={repoUrlMap[tagged.item.repository_id] ?? ""}
            />
          )}
          {tagged.provider === "youtube" && <YoutubeEntry item={tagged.item} />}
          {tagged.provider === "rss" && <RssEntry item={tagged.item} />}
          {tagged.provider === "scrap" && <ScrapEntry item={tagged.item} />}
        </View>
      )}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!loading} onRefresh={onRefresh} />
        ) : undefined
      }
    />
  )
}

function ChangelogEntry({ item, repoUrl }: { item: ChangelogItem; repoUrl: string }) {
  const href = repoUrl ? `${repoUrl}/releases/tag/${item.version}` : undefined
  const repoName = repoUrl?.replace("https://github.com/", "") ?? "repository"

  return (
    <Pressable
      onPress={href ? () => openUrl(href) : undefined}
      className="border-l-2 border-teal-400 pl-3 py-1"
    >
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
          {item.content.replace(/#{1,6}\s/g, "").replace(/\r\n/g, " ").slice(0, 200)}
        </Text>
      )}
    </Pressable>
  )
}

function YoutubeEntry({ item }: { item: YoutubeItem }) {
  let parsed: YoutubeItemContent | null = null
  try {
    parsed = JSON.parse(item.content) as YoutubeItemContent
  } catch { /* ignore */ }

  const videoUrl = parsed?.link ?? parsed?.url

  return (
    <Pressable
      onPress={videoUrl ? () => openUrl(videoUrl) : undefined}
      className="flex-row gap-3"
    >
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
        <Text className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100" numberOfLines={2}>
          {parsed?.title ?? "Sans titre"}
        </Text>
        <Text className="mt-1 text-xs font-mono text-gray-400">
          {formatDate(item.datetime ?? item.executed_at)}
        </Text>
      </View>
    </Pressable>
  )
}

function RssEntry({ item }: { item: RssItem }) {
  let parsed: RssItemContent | null = null
  try {
    parsed = JSON.parse(item.content) as RssItemContent
  } catch { /* ignore */ }

  return (
    <Pressable
      onPress={parsed?.link ? () => openUrl(parsed!.link) : undefined}
      className="border-l-2 border-amber-400 pl-3 py-1"
    >
      <View className="mb-1 flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100" numberOfLines={1}>
          {parsed?.title ?? "Sans titre"}
        </Text>
        {item.datetime && (
          <Text className="text-xs font-mono text-gray-400">{formatDate(item.datetime)}</Text>
        )}
      </View>
      {parsed?.summary && (
        <Text className="text-sm leading-relaxed text-gray-600 dark:text-gray-400" numberOfLines={2}>
          {parsed.summary}
        </Text>
      )}
    </Pressable>
  )
}

function ScrapEntry({ item }: { item: ScrapItem }) {
  const params: ScrapItemParams | null =
    typeof item.params === "string"
      ? (() => {
          try { return JSON.parse(item.params) as ScrapItemParams }
          catch { return null }
        })()
      : (item.params as ScrapItemParams | null)

  return (
    <Pressable
      onPress={params?.url ? () => openUrl(params.url) : undefined}
      className="border-l-2 border-green-400 pl-3 py-1"
    >
      <View className="mb-1 flex-row items-center justify-between gap-2">
        {params?.url && (
          <Text className="flex-1 text-xs font-mono text-gray-500 dark:text-gray-400" numberOfLines={1}>
            {params.url}
          </Text>
        )}
        <Text className="text-xs font-mono text-gray-400">{formatDate(item.executed_at)}</Text>
      </View>
      {item.content && (
        <Text className="text-sm leading-relaxed text-gray-600 dark:text-gray-400" numberOfLines={2}>
          {item.content.slice(0, 200)}
        </Text>
      )}
    </Pressable>
  )
}
