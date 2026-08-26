import { useEffect, useState } from "react"
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LogOut } from "lucide-react-native"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"
import { readApiUrl, resetApiUrl, writeApiUrl } from "@/lib/store"
import { colors } from "@/theme"

function ApiUrlSection() {
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
  }

  async function handleReset() {
    setPending("reset")
    setError(false)
    setSuccess(false)
    await resetApiUrl()
    setValue(await readApiUrl())
    setPending(null)
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

export default function ProfileScreen() {
  const { session, logout } = useAuth()
  const { t } = useLanguage()

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView contentContainerClassName="p-6 gap-6">
        {/* User info */}
        <View className="items-center gap-2">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.peach }}
          >
            <Text className="text-2xl font-semibold" style={{ color: colors.peachOn }}>
              {session?.name?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={{ fontFamily: "InstrumentSerif", fontSize: 22, color: colors.fg }}>
            {session?.name}
          </Text>
          <Text className="text-sm font-mono" style={{ color: colors.muted }}>
            {session?.email}
          </Text>
        </View>

        {/* Theme */}
        <View
          className="rounded-xl border p-4"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          <Text
            className="mb-3 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: colors.muted }}
          >
            {t.profile.theme}
          </Text>
          <ThemeToggle />
        </View>

        {/* Language */}
        <View
          className="rounded-xl border p-4"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          <Text
            className="mb-3 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: colors.muted }}
          >
            {t.profile.language}
          </Text>
          <LanguageSwitcher />
        </View>

        {/* API URL */}
        <ApiUrlSection />

        {/* Sign out */}
        <Pressable
          onPress={logout}
          className="flex-row items-center justify-center gap-2 rounded-xl border py-4 active:opacity-80"
          style={{ borderColor: "rgba(232, 168, 181, 0.3)", backgroundColor: colors.roseDim }}
        >
          <LogOut size={18} color={colors.rose} />
          <Text className="font-semibold" style={{ color: colors.rose }}>
            {t.profile.signOut}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
