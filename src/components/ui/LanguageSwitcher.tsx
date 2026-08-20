import { View, Pressable, Text } from "react-native"
import { useLanguage } from "@/context/LanguageContext"
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
      {LANGUAGES.map(({ code, label }) => (
        <Pressable
          key={code}
          onPress={() => setLang(code)}
          className={`rounded-md px-3 py-1.5 ${
            lang === code ? "bg-indigo-500" : "bg-gray-100 dark:bg-gray-800"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              lang === code ? "text-white" : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
