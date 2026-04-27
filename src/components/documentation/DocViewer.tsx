import { ScrollView, View, Text, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { ChevronLeft, Clock } from "lucide-react-native"
import { useLanguage } from "@/context/LanguageContext"
import { useDocContent } from "@/hooks/useDocumentation"
import { LoadingScreen } from "@/components/ui/LoadingScreen"

interface DocViewerProps {
  docId: number
}

export function DocViewer({ docId }: DocViewerProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const { doc, current, loading, error } = useDocContent(docId)

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
          onPress={() => router.push("/(app)/documentation")}
          className="mb-2 flex-row items-center gap-1"
        >
          <ChevronLeft size={14} color="#9ca3af" />
          <Text className="text-xs text-gray-400">{t.documentation.backToList}</Text>
        </Pressable>
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 font-semibold text-gray-900 dark:text-white">{doc?.name}</Text>
          <Pressable
            onPress={() => router.push(`/(app)/documentation/${docId}/history`)}
            className="ml-2 flex-row items-center gap-1 rounded-md border border-gray-200 px-2 py-1 dark:border-gray-700"
          >
            <Clock size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-500">{t.documentation.history}</Text>
          </Pressable>
        </View>
        {doc && (
          <Text className="mt-0.5 text-xs text-gray-400" numberOfLines={1}>{doc.url}</Text>
        )}
      </View>

      {current ? (
        <ScrollView className="flex-1 p-4">
          <Text className="font-mono text-xs leading-5 text-gray-700 dark:text-gray-300">
            {current.content}
          </Text>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm italic text-gray-400">{t.documentation.noContentScrapped}</Text>
        </View>
      )}
    </View>
  )
}
