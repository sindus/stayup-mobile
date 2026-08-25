import { View, Pressable, Text } from "react-native"
import { useLanguage } from "@/context/LanguageContext"
import { colors } from "@/theme"
import type { Language } from "@/lib/translations"

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "🇬🇧 English" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "it", label: "🇮🇹 Italiano" },
  { code: "pt", label: "🇵🇹 Português" },
  { code: "ja", label: "🇯🇵 日本語" },
  { code: "zh", label: "🇨🇳 中文" },
]

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()

  return (
    <View className="flex-row flex-wrap gap-2">
      {LANGUAGES.map(({ code, label }) => {
        const active = lang === code
        return (
          <Pressable
            key={code}
            onPress={() => setLang(code)}
            className="rounded-md px-3 py-1.5"
            style={{ backgroundColor: active ? colors.peach : colors.bg }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: active ? colors.peachOn : colors.fgSoft }}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
