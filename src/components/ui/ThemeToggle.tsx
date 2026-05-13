import { Pressable, Text } from "react-native"
import { Moon, Sun } from "lucide-react-native"
import { useTheme } from "@/context/ThemeContext"
import { useLanguage } from "@/context/LanguageContext"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()

  return (
    <Pressable
      onPress={toggleTheme}
      className="flex-row items-center gap-2 rounded-lg p-2 active:opacity-70"
    >
      {theme === "dark" ? <Sun size={18} color="#9ca3af" /> : <Moon size={18} color="#6b7280" />}
      <Text className="text-sm text-gray-700 dark:text-gray-300">
        {theme === "dark" ? t.profile.lightMode : t.profile.darkMode}
      </Text>
    </Pressable>
  )
}
