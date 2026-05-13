import { FlatList, View, Text, Pressable, RefreshControl } from "react-native"
import { useRouter } from "expo-router"
import { useLanguage } from "@/context/LanguageContext"
import { useDocumentation } from "@/hooks/useDocumentation"
import { LoadingScreen } from "@/components/ui/LoadingScreen"

export function DocList() {
  const { t } = useLanguage()
  const router = useRouter()
  const { docs, loading, error, refresh, subscribe, unsubscribe } = useDocumentation()

  if (loading && docs.length === 0) {
    return <LoadingScreen message={t.documentation.loading} />
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <Text className="text-sm text-red-500">{error}</Text>
        <Pressable onPress={refresh} className="rounded-lg bg-indigo-600 px-4 py-2">
          <Text className="text-white">{t.feed.retry}</Text>
        </Pressable>
      </View>
    )
  }

  if (docs.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm italic text-gray-400">{t.documentation.noContent}</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={docs}
      keyExtractor={(d) => String(d.id)}
      contentContainerClassName="p-4 gap-4"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      renderItem={({ item: doc }) => (
        <View className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <Text className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</Text>
          <Text className="mt-0.5 text-xs text-gray-400" numberOfLines={1}>{doc.url}</Text>
          {doc.current_version !== null && (
            <Text className="mt-0.5 text-xs text-gray-400">
              {t.documentation.version} {doc.current_version}
            </Text>
          )}

          <View className="mt-3 flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => router.push(`/(app)/documentation/${doc.id}`)}
              className="rounded-md border border-gray-200 px-2.5 py-1 dark:border-gray-700"
            >
              <Text className="text-xs text-gray-700 dark:text-gray-300">
                {t.documentation.viewContent}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/(app)/documentation/${doc.id}/history`)}
              className="rounded-md border border-gray-200 px-2.5 py-1 dark:border-gray-700"
            >
              <Text className="text-xs text-gray-700 dark:text-gray-300">
                {t.documentation.viewHistory}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => (doc.is_subscribed ? unsubscribe(doc.id) : subscribe(doc.id))}
              className={`ml-auto rounded-md px-2.5 py-1 ${
                doc.is_subscribed ? "bg-gray-100 dark:bg-gray-800" : "bg-indigo-600"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  doc.is_subscribed ? "text-gray-600 dark:text-gray-400" : "text-white"
                }`}
              >
                {doc.is_subscribed ? t.documentation.unsubscribe : t.documentation.subscribe}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  )
}
