import { useState, useEffect } from "react"
import { ScrollView, View, Text, Pressable } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Image } from "expo-image"
import { ChevronLeft } from "lucide-react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useSelectedFeedItemStore } from "@/store/selectedFeedItem"
import { useReadItemsStore } from "@/store/readItems"
import { useLanguage } from "@/context/LanguageContext"
import { formatDate, openUrl } from "@/lib/utils"
import type { TaggedItem, YoutubeItemContent, RssItemContent, ScrapItemParams } from "@/types"

const LS_FONT_KEY = "STAYUP_FONT_SIZE_OFFSET"
const BASE_FONT = 16
const MIN_OFFSET = -4
const MAX_OFFSET = 10

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function extractChannelName(url: string): string {
  try {
    const { pathname } = new URL(url)
    const atMatch = pathname.match(/^\/@(.+)/)
    if (atMatch) return `@${atMatch[1]}`
    const segments = pathname.split("/").filter(Boolean)
    return segments[segments.length - 1] ?? url
  } catch {
    return url
  }
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function getTitle(tagged: TaggedItem, noTitle: string, scrapLabel: string): string {
  if (tagged.provider === "changelog") return tagged.item.version
  if (tagged.provider === "youtube") {
    try {
      const parsed = JSON.parse(tagged.item.content) as YoutubeItemContent
      return parsed.title ?? noTitle
    } catch {
      return noTitle
    }
  }
  if (tagged.provider === "rss") {
    try {
      const parsed = JSON.parse(tagged.item.content) as RssItemContent
      return parsed.title ?? noTitle
    } catch {
      return noTitle
    }
  }
  return scrapLabel
}

export default function FeedDetailScreen() {
  const router = useRouter()
  const { t } = useLanguage()
  const { item: tagged, repoUrl } = useSelectedFeedItemStore()
  const { markRead } = useReadItemsStore()
  const [fontSizeOffset, setFontSizeOffset] = useState(0)

  useEffect(() => {
    if (tagged) void markRead(tagged)
  }, [tagged, markRead])

  useEffect(() => {
    void AsyncStorage.getItem(LS_FONT_KEY).then((v) => {
      if (v) setFontSizeOffset(parseInt(v, 10) || 0)
    })
  }, [])

  function adjustFont(delta: number) {
    setFontSizeOffset((prev) => {
      const next = Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, prev + delta))
      void AsyncStorage.setItem(LS_FONT_KEY, String(next))
      return next
    })
  }

  if (!tagged) return null

  const bodyFontSize = BASE_FONT + fontSizeOffset

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={["top"]}>
      <View className="flex-row items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Pressable
          onPress={() => router.back()}
          className="rounded p-1"
          style={{ marginLeft: -4 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color="#6b7280" />
        </Pressable>
        <Text
          className="flex-1 text-base font-semibold text-gray-900 dark:text-gray-100"
          numberOfLines={1}
        >
          {getTitle(tagged, t.viewer.noTitle, t.viewer.scrap)}
        </Text>
        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={() => adjustFont(-1)}
            disabled={fontSizeOffset <= MIN_OFFSET}
            className="rounded px-2 py-1"
            style={{ opacity: fontSizeOffset <= MIN_OFFSET ? 0.35 : 1 }}
          >
            <Text className="font-mono text-base text-gray-500 dark:text-gray-400">A−</Text>
          </Pressable>
          <Pressable
            onPress={() => adjustFont(1)}
            disabled={fontSizeOffset >= MAX_OFFSET}
            className="rounded px-2 py-1"
            style={{ opacity: fontSizeOffset >= MAX_OFFSET ? 0.35 : 1 }}
          >
            <Text className="font-mono text-lg text-gray-500 dark:text-gray-400">A+</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {tagged.provider === "changelog" && (
          <ChangelogDetail
            item={tagged.item}
            repoUrl={repoUrl}
            repositoryLabel={t.viewer.repository}
            openOnGithub={t.viewer.openOnGithub}
            bodyFontSize={bodyFontSize}
          />
        )}
        {tagged.provider === "youtube" && (
          <YoutubeDetail
            item={tagged.item}
            noTitle={t.viewer.noTitle}
            watchOnYoutube={t.viewer.watchOnYoutube}
            bodyFontSize={bodyFontSize}
          />
        )}
        {tagged.provider === "rss" && (
          <RssDetail
            item={tagged.item}
            noTitle={t.viewer.noTitle}
            readArticle={t.viewer.readArticle}
            bodyFontSize={bodyFontSize}
          />
        )}
        {tagged.provider === "scrap" && (
          <ScrapDetail
            item={tagged.item}
            visitWebsite={t.viewer.visitWebsite}
            bodyFontSize={bodyFontSize}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function ChangelogDetail({
  item,
  repoUrl,
  repositoryLabel,
  openOnGithub,
  bodyFontSize,
}: {
  item: import("@/types").ChangelogItem
  repoUrl: string
  repositoryLabel: string
  openOnGithub: string
  bodyFontSize: number
}) {
  const repoName = repoUrl.replace("https://github.com/", "") || repositoryLabel
  const href = repoUrl ? `${repoUrl}/releases/tag/${item.version}` : undefined

  return (
    <View>
      <View className="mb-4 flex-row items-center gap-2">
        <Text className="text-sm font-mono text-gray-500">{repoName}</Text>
        <View className="rounded bg-teal-50 px-1.5 py-0.5 dark:bg-teal-900/30">
          <Text className="text-sm font-mono font-semibold text-teal-700 dark:text-teal-400">
            {item.version}
          </Text>
        </View>
        <Text className="ml-auto text-sm font-mono text-gray-500">
          {formatDate(item.datetime ?? item.executed_at)}
        </Text>
      </View>

      {item.content && (
        <Text
          className="leading-relaxed text-gray-700 dark:text-gray-300"
          style={{ fontSize: bodyFontSize }}
        >
          {item.content
            .replace(/#{1,6}\s/g, "")
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/`([^`]+)`/g, "$1")}
        </Text>
      )}

      {href && (
        <Pressable
          onPress={() => openUrl(href)}
          className="mt-6 rounded-lg bg-teal-50 px-4 py-2.5 dark:bg-teal-900/20"
        >
          <Text className="text-center text-base font-medium text-teal-700 dark:text-teal-400">
            {openOnGithub}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

function YoutubeDetail({
  item,
  noTitle,
  watchOnYoutube,
  bodyFontSize,
}: {
  item: import("@/types").YoutubeItem
  noTitle: string
  watchOnYoutube: string
  bodyFontSize: number
}) {
  let parsed: YoutubeItemContent | null = null
  try {
    parsed = JSON.parse(item.content) as YoutubeItemContent
  } catch {
    /* ignore */
  }

  const videoUrl = parsed?.link ?? parsed?.url
  const channelName = parsed?.url ? extractChannelName(parsed.url) : null

  return (
    <View>
      <Text
        className="mb-2 font-semibold text-gray-900 dark:text-gray-100 leading-snug"
        style={{ fontSize: bodyFontSize + 2 }}
      >
        {parsed?.title ?? noTitle}
      </Text>

      <View className="mb-4 flex-row items-center gap-3">
        {channelName && <Text className="text-sm font-mono text-rose-400">{channelName}</Text>}
        <Text className="text-sm font-mono text-gray-500">
          {formatDate(item.datetime ?? item.executed_at)}
        </Text>
      </View>

      {parsed?.thumbnail && (
        <View className="mb-4 overflow-hidden rounded-lg" style={{ aspectRatio: 16 / 9 }}>
          <Image
            source={{ uri: parsed.thumbnail }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>
      )}

      {videoUrl && (
        <Pressable
          onPress={() => openUrl(videoUrl)}
          className="rounded-lg bg-rose-50 px-4 py-2.5 dark:bg-rose-900/20"
        >
          <Text className="text-center text-base font-medium text-rose-600 dark:text-rose-400">
            {watchOnYoutube}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

function RssDetail({
  item,
  noTitle,
  readArticle,
  bodyFontSize,
}: {
  item: import("@/types").RssItem
  noTitle: string
  readArticle: string
  bodyFontSize: number
}) {
  let parsed: RssItemContent | null = null
  try {
    parsed = JSON.parse(item.content) as RssItemContent
  } catch {
    /* ignore */
  }

  const source = parsed?.link ? extractHostname(parsed.link) : null
  const summary = parsed?.summary ? stripHtml(parsed.summary) : null

  return (
    <View>
      <Text
        className="mb-2 font-semibold text-gray-900 dark:text-gray-100 leading-snug"
        style={{ fontSize: bodyFontSize + 2 }}
      >
        {parsed?.title ?? noTitle}
      </Text>

      <View className="mb-4 flex-row items-center gap-3">
        {source && <Text className="text-sm font-mono text-amber-500">{source}</Text>}
        <Text className="text-sm font-mono text-gray-500">
          {formatDate(item.datetime ?? item.executed_at)}
        </Text>
      </View>

      {summary && (
        <Text
          className="leading-relaxed text-gray-700 dark:text-gray-300"
          style={{ fontSize: bodyFontSize }}
        >
          {summary}
        </Text>
      )}

      {parsed?.link && (
        <Pressable
          onPress={() => openUrl(parsed!.link)}
          className="mt-6 rounded-lg bg-amber-50 px-4 py-2.5 dark:bg-amber-900/20"
        >
          <Text className="text-center text-base font-medium text-amber-700 dark:text-amber-400">
            {readArticle}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

function ScrapDetail({
  item,
  visitWebsite,
  bodyFontSize,
}: {
  item: import("@/types").ScrapItem
  visitWebsite: string
  bodyFontSize: number
}) {
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
    <View>
      <View className="mb-4 flex-row items-center gap-3">
        {params?.url && (
          <Text className="flex-1 text-sm font-mono text-green-600" numberOfLines={1}>
            {params.url}
          </Text>
        )}
        <Text className="text-sm font-mono text-gray-500 shrink-0">
          {formatDate(item.executed_at)}
        </Text>
      </View>

      {item.content && (
        <Text
          className="leading-relaxed text-gray-700 dark:text-gray-300"
          style={{ fontSize: bodyFontSize }}
        >
          {item.content}
        </Text>
      )}

      {params?.url && (
        <Pressable
          onPress={() => openUrl(params.url)}
          className="mt-6 rounded-lg bg-green-50 px-4 py-2.5 dark:bg-green-900/20"
        >
          <Text className="text-center text-base font-medium text-green-700 dark:text-green-400">
            {visitWebsite}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
