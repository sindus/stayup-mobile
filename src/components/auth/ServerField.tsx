import { useEffect, useState } from "react"
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native"
import { readApiUrl, resetApiUrl, writeApiUrl } from "@/lib/store"
import { useLanguage } from "@/context/LanguageContext"
import { colors } from "@/theme"

/**
 * Réglage de l'URL de l'API StayUp. Utilisé dans le profil (session ouverte) et
 * sur l'écran de connexion (avant toute session) — d'où `onChanged`, qui laisse
 * l'écran de connexion relire `/auth/config` après un changement.
 */
export function ServerField({ onChanged }: { onChanged?: () => void }) {
  const { t } = useLanguage()
  const [value, setValue] = useState("")
  const [pending, setPending] = useState<"save" | "reset" | null>(null)
  const [error, setError] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    readApiUrl().then(setValue)
  }, [])

  async function handleSave() {
    setError(false)
    setSuccess(false)
    const trimmed = value.trim().replace(/\/$/, "")
    try {
      new URL(trimmed)
    } catch {
      setError(true)
      return
    }
    setPending("save")
    await writeApiUrl(trimmed)
    setValue(trimmed)
    setPending(null)
    setSuccess(true)
    onChanged?.()
  }

  async function handleReset() {
    setPending("reset")
    setError(false)
    setSuccess(false)
    await resetApiUrl()
    setValue(await readApiUrl())
    setPending(null)
    onChanged?.()
  }

  return (
    <View
      className="rounded-xl border p-4"
      style={{ borderColor: colors.border, backgroundColor: colors.surface }}
    >
      <Text
        className="mb-3 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: colors.muted }}
      >
        {t.profile.apiUrl}
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        keyboardType="url"
        className="rounded-lg border px-3 py-2.5"
        style={{ borderColor: colors.border, backgroundColor: colors.bg, color: colors.fg }}
      />
      {error && (
        <Text className="mt-2 text-sm" style={{ color: colors.rose }}>
          {t.profile.apiUrlInvalid}
        </Text>
      )}
      {success && (
        <Text className="mt-2 text-sm" style={{ color: colors.sage }}>
          {t.profile.apiUrlSaved}
        </Text>
      )}
      <View className="mt-3 flex-row gap-2">
        <Pressable
          onPress={handleSave}
          disabled={pending !== null}
          className="flex-1 items-center rounded-lg py-2.5 disabled:opacity-50"
          style={{ backgroundColor: colors.peach }}
        >
          {pending === "save" ? (
            <ActivityIndicator size="small" color={colors.peachOn} />
          ) : (
            <Text className="font-semibold" style={{ color: colors.peachOn }}>
              {t.profile.apiUrlSave}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={handleReset}
          disabled={pending !== null}
          className="flex-1 items-center rounded-lg border py-2.5 disabled:opacity-50"
          style={{ borderColor: colors.border }}
        >
          {pending === "reset" ? (
            <ActivityIndicator size="small" color={colors.fgSoft} />
          ) : (
            <Text className="font-medium" style={{ color: colors.fgSoft }}>
              {t.profile.apiUrlReset}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}
