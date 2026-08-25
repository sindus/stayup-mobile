import { useState } from "react"
import { ScrollView, View, Text, Pressable, Alert } from "react-native"
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react-native"
import { ImportExportButtons } from "./ImportExportButtons"
import type { FeedFlux } from "@/hooks/useFeed"
import { useLanguage } from "@/context/LanguageContext"
import { deleteUserRepository } from "@/lib/api"
import { readToken, readApiUrl } from "@/lib/store"
import { stripUrlScheme } from "@/lib/utils"
import { colors, provider as providerMeta } from "@/theme"
import type { Provider } from "@/types"

interface FeedFluxListProps {
  fluxes: FeedFlux[]
  userId: string
  selectedProvider: Provider | null
  onSelectProvider: (p: Provider | null) => void
  onAddPress: () => void
  onDeleted: () => void
  onImported: () => void
  unreadCountByRepoId?: Record<number, number>
}

export function FeedFluxList({
  fluxes,
  userId,
  selectedProvider,
  onSelectProvider,
  onAddPress,
  onDeleted,
  onImported,
  unreadCountByRepoId = {},
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
          } catch {
            /* ignore */
          }
        },
      },
    ])
  }

  return (
    <View className="border-b" style={{ borderColor: colors.borderSoft }}>
      {/* Header bar — toujours visible */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        className="flex-row items-center justify-between px-4 py-2.5"
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold" style={{ color: colors.fg }}>
            {t.feed.myFeeds}
          </Text>
          {/* Badge du filtre actif quand replié */}
          {!expanded && selectedProvider && (
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: providerMeta[selectedProvider].dim }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: providerMeta[selectedProvider].color }}
              >
                {t.feed.providers[selectedProvider]}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-2">
          {/* Bouton + toujours accessible */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation()
              onAddPress()
            }}
            className="rounded-full p-1"
            hitSlop={8}
          >
            <Plus size={16} color={colors.peach} />
          </Pressable>
          <ImportExportButtons fluxes={fluxes} userId={userId} onImported={onImported} />
          {expanded ? (
            <ChevronUp size={16} color={colors.muted} />
          ) : (
            <ChevronDown size={16} color={colors.muted} />
          )}
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
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: selectedProvider === null ? colors.peach : colors.surface }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: selectedProvider === null ? colors.peachOn : colors.fgSoft }}
              >
                {t.feed.allFeeds}
              </Text>
            </Pressable>

            {providers.map((p) => {
              const providerFluxes = fluxes.filter((f) => f.provider === p)
              if (providerFluxes.length === 0) return null
              const providerUnread = providerFluxes.reduce(
                (sum, f) => sum + (unreadCountByRepoId[f.repository_id] ?? 0),
                0,
              )
              const active = selectedProvider === p
              return (
                <Pressable
                  key={p}
                  onPress={() => onSelectProvider(active ? null : p)}
                  className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                  style={{ backgroundColor: active ? providerMeta[p].dim : colors.surface }}
                >
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: providerMeta[p].color }}
                  />
                  <Text
                    className="text-base font-medium"
                    style={{ color: active ? providerMeta[p].color : colors.fgSoft }}
                  >
                    {t.feed.providers[p]}
                  </Text>
                  {providerUnread > 0 && (
                    <View
                      className="rounded-full px-1.5 py-0.5"
                      style={{ backgroundColor: colors.peach }}
                    >
                      <Text
                        className="text-xs font-mono font-semibold"
                        style={{ color: colors.peachOn }}
                      >
                        {providerUnread}
                      </Text>
                    </View>
                  )}
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
                .map((flux) => {
                  const fluxUnread = unreadCountByRepoId[flux.repository_id] ?? 0
                  return (
                    <View
                      key={flux.id}
                      className="flex-row items-center gap-1 rounded-lg border px-2 py-1"
                      style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                    >
                      <Text
                        className="max-w-[140px] text-sm font-mono"
                        style={{ color: colors.fgSoft }}
                        numberOfLines={1}
                      >
                        {stripUrlScheme(flux.identifier)}
                      </Text>
                      {fluxUnread > 0 && (
                        <View
                          className="rounded-full px-1 py-0.5"
                          style={{ backgroundColor: colors.peach }}
                        >
                          <Text
                            className="text-xs font-mono font-semibold"
                            style={{ color: colors.peachOn }}
                          >
                            {fluxUnread}
                          </Text>
                        </View>
                      )}
                      <Pressable onPress={() => handleDelete(flux)} className="ml-1 p-0.5">
                        <Trash2 size={12} color={colors.muted} />
                      </Pressable>
                    </View>
                  )
                })}
            </ScrollView>
          )}
        </>
      )}
    </View>
  )
}
