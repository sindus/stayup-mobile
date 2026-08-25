import { View, Text, Pressable, ScrollView, Alert } from "react-native"
import { Image } from "expo-image"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { ChevronLeft, ChevronUp, ChevronDown, ExternalLink } from "lucide-react-native"
import { useFeedReaderStore } from "@/store/feedReader"
import { openUrl } from "@/lib/utils"
import { colors, provider as providerMeta } from "@/theme"

export default function ArticleScreen() {
  const router = useRouter()
  const { articles, index, open } = useFeedReaderStore()

  const article = articles[index]
  if (!article) return null

  const hasPrev = index > 0
  const hasNext = index < articles.length - 1

  function handleOpenInBrowser() {
    if (!article.url) return
    Alert.alert(
      "Ouvrir dans le navigateur",
      "Vous allez quitter l'application pour ouvrir cet article dans votre navigateur.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Ouvrir",
          onPress: () => openUrl(article.url!),
        },
      ],
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
      {/* Header */}
      <View
        className="flex-row items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: colors.borderSoft }}
      >
        <Pressable onPress={() => router.back()} className="p-1" hitSlop={12}>
          <ChevronLeft size={22} color={colors.peach} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: colors.fg }} numberOfLines={1}>
            {article.title}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: providerMeta[article.provider].color }}
            />
            <Text className="text-xs" style={{ color: colors.dim }}>
              {article.date}
            </Text>
          </View>
        </View>
        {article.url && (
          <Pressable onPress={handleOpenInBrowser} className="p-1" hitSlop={12}>
            <ExternalLink size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Content */}
      <ScrollView contentContainerClassName="p-5 gap-4" showsVerticalScrollIndicator={false}>
        {/* YouTube : vignette + titre */}
        {article.provider === "youtube" && article.thumbnail && (
          <View className="overflow-hidden rounded-xl">
            <Image
              source={{ uri: article.thumbnail }}
              style={{ width: "100%", aspectRatio: 16 / 9 }}
              contentFit="cover"
            />
          </View>
        )}

        {/* Titre complet */}
        <Text style={{ fontFamily: "InstrumentSerif", fontSize: 24, color: colors.fg }}>
          {article.title}
        </Text>

        {/* Corps de l'article */}
        {article.content ? (
          <Text className="text-base leading-7" style={{ color: colors.fgSoft }}>
            {article.content}
          </Text>
        ) : (
          <View className="items-center py-10">
            <Text className="text-sm italic" style={{ color: colors.dim }}>
              Aucun contenu disponible.
              {article.url ? "\nOuvre dans le navigateur pour voir l'article complet." : ""}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation précédent / suivant */}
      <View className="flex-row border-t" style={{ borderColor: colors.borderSoft }}>
        <Pressable
          onPress={() => hasPrev && open(articles, index - 1)}
          disabled={!hasPrev}
          className="flex-1 items-center py-4"
          style={{ opacity: hasPrev ? 1 : 0.3 }}
        >
          <ChevronUp size={22} color={colors.peach} />
        </Pressable>
        <View className="w-px" style={{ backgroundColor: colors.borderSoft }} />
        <Pressable
          onPress={() => hasNext && open(articles, index + 1)}
          disabled={!hasNext}
          className="flex-1 items-center py-4"
          style={{ opacity: hasNext ? 1 : 0.3 }}
        >
          <ChevronDown size={22} color={colors.peach} />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
