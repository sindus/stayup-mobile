import { useState } from "react"
import { View, Pressable, Alert, ActivityIndicator } from "react-native"
import { Download, Upload } from "lucide-react-native"
import * as DocumentPicker from "expo-document-picker"
import * as Sharing from "expo-sharing"
import { File, Paths } from "expo-file-system"
import { buildOpml, parseOpml, type OpmlFlux } from "@/lib/opml"
import { addUserRepository, getScrapRepos, subscribeScrap } from "@/lib/api"
import { readToken, readApiUrl } from "@/lib/store"
import { useLanguage } from "@/context/LanguageContext"
import type { FeedFlux } from "@/hooks/useFeed"
import type { Translations } from "@/lib/translations"

interface ImportExportButtonsProps {
  fluxes: FeedFlux[]
  userId: string
  onImported: () => void
}

function resultMessage(
  t: Translations,
  { added, skipped, unavailable }: { added: number; skipped: number; unavailable: number },
): string {
  return [
    added > 0 && `${added} ${t.importExport.added}`,
    skipped > 0 && `${skipped} ${t.importExport.alreadyPresent}`,
    unavailable > 0 && `${unavailable} ${t.importExport.unavailable}`,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function ImportExportButtons({ fluxes, userId, onImported }: ImportExportButtonsProps) {
  const { t } = useLanguage()
  const [importing, setImporting] = useState(false)

  async function handleExport() {
    const opml = buildOpml(
      fluxes.map((f) => ({ provider: f.provider, url: f.url, identifier: f.identifier })),
      "StayUp",
    )
    const file = new File(Paths.cache, "stayup-feeds.opml")
    file.create({ overwrite: true })
    file.write(opml)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: "text/x-opml", UTI: "public.xml" })
    }
  }

  async function resolveScrapRepoId(
    url: string,
    token: string,
    apiUrl: string,
  ): Promise<number | null> {
    try {
      const repos = await getScrapRepos(token, apiUrl)
      return repos.find((r) => r.url === url)?.id ?? null
    } catch {
      return null
    }
  }

  async function importEntry(
    entry: OpmlFlux,
    token: string,
    apiUrl: string,
  ): Promise<"added" | "unavailable" | "failed"> {
    try {
      if (entry.provider === "scrap") {
        const scrapRepoId = await resolveScrapRepoId(entry.url, token, apiUrl)
        if (scrapRepoId === null) return "unavailable"
        await subscribeScrap(scrapRepoId, token, apiUrl)
        return "added"
      }

      await addUserRepository(userId, token, apiUrl, {
        provider: entry.provider,
        url: entry.url,
        config: { max_scraps: 5, retention_days: 15 },
      })
      return "added"
    } catch {
      return "failed"
    }
  }

  async function handleImport() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["text/xml", "text/x-opml", "application/xml", "*/*"],
      copyToCacheDirectory: true,
    })
    if (picked.canceled || !picked.assets?.[0]) return

    const text = await new File(picked.assets[0].uri).text()
    const entries = parseOpml(text)
    if (entries.length === 0) {
      Alert.alert(t.importExport.invalidFile)
      return
    }

    setImporting(true)
    const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
    const existing = new Set(fluxes.map((f) => `${f.provider}:${f.url}`))
    let added = 0
    let skipped = 0
    let unavailable = 0

    if (token) {
      for (const entry of entries) {
        if (existing.has(`${entry.provider}:${entry.url}`)) {
          skipped++
          continue
        }
        const outcome = await importEntry(entry, token, apiUrl)
        if (outcome === "added") added++
        else if (outcome === "unavailable") unavailable++
      }
    }

    setImporting(false)
    Alert.alert(t.importExport.import, resultMessage(t, { added, skipped, unavailable }))
    if (added > 0) onImported()
  }

  return (
    <View className="flex-row items-center gap-1">
      <Pressable
        onPress={(e) => {
          e.stopPropagation()
          void handleExport()
        }}
        className="rounded-full p-1"
        hitSlop={8}
        accessibilityLabel={t.importExport.export}
      >
        <Download size={16} color="#6366f1" />
      </Pressable>
      <Pressable
        onPress={(e) => {
          e.stopPropagation()
          void handleImport()
        }}
        disabled={importing}
        className="rounded-full p-1"
        hitSlop={8}
        accessibilityLabel={t.importExport.import}
      >
        {importing ? (
          <ActivityIndicator size="small" color="#6366f1" />
        ) : (
          <Upload size={16} color="#6366f1" />
        )}
      </Pressable>
    </View>
  )
}
