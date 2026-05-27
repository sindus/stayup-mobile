import { FlatList, View, Text, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { ChevronLeft, ChevronRight } from "lucide-react-native"
import { useLanguage } from "@/context/LanguageContext"
import { useDocHistory } from "@/hooks/useDocumentation"
import { LoadingScreen } from "@/components/ui/LoadingScreen"

interface HistoryListProps {
  docId: number
}

export function HistoryList({ docId }: HistoryListProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const { docName, versions, loading, error } = useDocHistory(docId)

  if (loading) return <LoadingScreen message={t.documentation.loading} />

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-sm text-red-500">{error}</Text>
      </View>
    )
  }

  return (
    <View className="flex-1">
      <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Pressable
          onPress={() => router.push(`/(app)/documentation/${docId}`)}
          className="mb-1 flex-row items-center gap-1"
        >
          <ChevronLeft size={14} color="#9ca3af" />
          <Text className="text-xs text-gray-400">{t.documentation.backToDoc}</Text>
        </Pressable>
        <Text className="font-semibold text-gray-900 dark:text-white">
          {docName} — {t.documentation.history}
        </Text>
      </View>

      <FlatList
        data={versions}
        keyExtractor={(v) => String(v.id)}
        contentContainerClassName="p-4 gap-3"
        renderItem={({ item: v }) => (
          <Pressable
            onPress={
              v.has_diff
                ? () => router.push(`/(app)/documentation/${docId}/diff/${v.id}`)
                : undefined
            }
            className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <View className="gap-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-medium text-gray-900 dark:text-white">
                  {t.documentation.version} {v.version}
                </Text>
                {v.is_current && (
                  <View className="rounded bg-indigo-100 px-1.5 py-0.5 dark:bg-indigo-900/30">
                    <Text className="text-xs text-indigo-700 dark:text-indigo-400">
                      {t.documentation.current}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-gray-400">
                {t.documentation.scrapedAt} {new Date(v.scraped_at).toLocaleDateString("fr-FR")}
              </Text>
              {v.archived_at && (
                <Text className="text-xs text-gray-400">
                  {t.documentation.archivedAt} {new Date(v.archived_at).toLocaleDateString("fr-FR")}
                </Text>
              )}
            </View>
            {v.has_diff && <ChevronRight size={16} color="#9ca3af" />}
          </Pressable>
        )}
      />
    </View>
  )
}
