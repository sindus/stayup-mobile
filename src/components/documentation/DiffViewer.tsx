import { ScrollView, View, Text, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import { useLanguage } from "@/context/LanguageContext"
import { useDocDiff } from "@/hooks/useDocumentation"
import { LoadingScreen } from "@/components/ui/LoadingScreen"

function classifyLine(line: string): "added" | "removed" | "header" | "context" {
  if (line.startsWith("+") && !line.startsWith("+++")) return "added"
  if (line.startsWith("-") && !line.startsWith("---")) return "removed"
  if (line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")) return "header"
  return "context"
}

interface DiffViewerProps {
  docId: number
  versionId: number
}

export function DiffViewer({ docId, versionId }: DiffViewerProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const { docName, version, diff, scraped_at, loading, error } = useDocDiff(docId, versionId)

  if (loading) return <LoadingScreen message={t.documentation.loading} />

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-sm text-red-500">{error}</Text>
      </View>
    )
  }

  const lines = diff?.split("\n") ?? []

  return (
    <View className="flex-1">
      <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Pressable
          onPress={() => router.push(`/(app)/documentation/${docId}/history`)}
          className="mb-2 flex-row items-center gap-1"
        >
          <ChevronLeft size={14} color="#9ca3af" />
          <Text className="text-xs text-gray-400">{t.documentation.history}</Text>
        </Pressable>
        {docName && version !== null && (
          <>
            <Text className="font-semibold text-gray-900 dark:text-white">{docName}</Text>
            <Text className="text-xs text-gray-400">
              {t.documentation.version} {version}
              {scraped_at && ` · ${t.documentation.scrapedAt} ${new Date(scraped_at).toLocaleDateString()}`}
            </Text>
          </>
        )}
      </View>

      {diff ? (
        <ScrollView horizontal>
          <ScrollView>
            <View>
              {lines.map((line, i) => {
                const kind = classifyLine(line)
                return (
                  <View
                    key={i}
                    className={`px-4 py-0.5 ${
                      kind === "added"
                        ? "bg-green-500/10"
                        : kind === "removed"
                        ? "bg-red-500/10"
                        : ""
                    }`}
                  >
                    <Text
                      className={`font-mono text-xs ${
                        kind === "added"
                          ? "text-green-700 dark:text-green-400"
                          : kind === "removed"
                          ? "text-red-700 dark:text-red-400"
                          : kind === "header"
                          ? "text-gray-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {line || " "}
                    </Text>
                  </View>
                )
              })}
            </View>
          </ScrollView>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm italic text-gray-400">{t.documentation.noDiff}</Text>
        </View>
      )}
    </View>
  )
}
