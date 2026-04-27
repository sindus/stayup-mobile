import { useState } from "react"
import { ScrollView, View, Text, Pressable, Alert } from "react-native"
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react-native"
import type { FeedFlux } from "@/hooks/useFeed"
import { useLanguage } from "@/context/LanguageContext"
import { deleteUserRepository } from "@/lib/api"
import { readToken, readApiUrl } from "@/lib/store"
import type { Provider } from "@/types"

const PROVIDER_COLORS: Record<Provider, string> = {
  changelog: "#14b8a6",
  youtube: "#f43f5e",
  rss: "#f59e0b",
  scrap: "#22c55e",
}

interface FeedFluxListProps {
  fluxes: FeedFlux[]
  userId: string
  selectedProvider: Provider | null
  onSelectProvider: (p: Provider | null) => void
  onAddPress: () => void
  onDeleted: () => void
}

export function FeedFluxList({
  fluxes,
  userId,
  selectedProvider,
  onSelectProvider,
  onAddPress,
  onDeleted,
}: FeedFluxListProps) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(true)

  const providers: Provider[] = ["changelog", "youtube", "rss", "scrap"]

  async function handleDelete(flux: FeedFlux) {
    Alert.alert(t.common.confirmDelete, flux.identifier, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
            if (!token) return
            await deleteUserRepository(userId, flux.id, token, apiUrl)
            onDeleted()
          } catch { /* ignore */ }
        },
      },
    ])
  }

  return (
    <View className="border-b border-gray-100 dark:border-gray-800">
      {/* Header bar — toujours visible */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        className="flex-row items-center justify-between px-4 py-2.5"
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t.feed.myFeeds}
          </Text>
          {/* Badge du filtre actif quand replié */}
          {!expanded && selectedProvider && (
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: PROVIDER_COLORS[selectedProvider] + "22" }}
            >
              <Text className="text-xs font-medium" style={{ color: PROVIDER_COLORS[selectedProvider] }}>
                {t.feed.providers[selectedProvider]}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-2">
          {/* Bouton + toujours accessible */}
          <Pressable
            onPress={(e) => { e.stopPropagation(); onAddPress() }}
            className="rounded-full p-1"
            hitSlop={8}
          >
            <Plus size={16} color="#6366f1" />
          </Pressable>
          {expanded
            ? <ChevronUp size={16} color="#9ca3af" />
            : <ChevronDown size={16} color="#9ca3af" />
          }
        </View>
      </Pressable>

      {/* Section repliable */}
      {expanded && (
        <>
          {/* Provider chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="flex-row gap-2 px-4 pb-2"
          >
            <Pressable
              onPress={() => onSelectProvider(null)}
              className={`rounded-full px-3 py-1.5 ${
                selectedProvider === null ? "bg-indigo-600" : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedProvider === null ? "text-white" : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {t.feed.allFeeds}
              </Text>
            </Pressable>

            {providers.map((p) => {
              const count = fluxes.filter((f) => f.provider === p).length
              if (count === 0) return null
              return (
                <Pressable
                  key={p}
                  onPress={() => onSelectProvider(selectedProvider === p ? null : p)}
                  className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                    selectedProvider === p ? "bg-indigo-600" : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: PROVIDER_COLORS[p] }}
                  />
                  <Text
                    className={`text-sm font-medium ${
                      selectedProvider === p ? "text-white" : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t.feed.providers[p]}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {/* Flux individuels (quand un provider est sélectionné) */}
          {selectedProvider && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="flex-row gap-2 px-4 pb-2"
            >
              {fluxes
                .filter((f) => f.provider === selectedProvider)
                .map((flux) => (
                  <View
                    key={flux.id}
                    className="flex-row items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <Text
                      className="max-w-[140px] text-xs text-gray-700 dark:text-gray-300"
                      numberOfLines={1}
                    >
                      {flux.identifier}
                    </Text>
                    <Pressable onPress={() => handleDelete(flux)} className="ml-1 p-0.5">
                      <Trash2 size={12} color="#9ca3af" />
                    </Pressable>
                  </View>
                ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  )
}
