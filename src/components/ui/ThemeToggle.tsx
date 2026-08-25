import { Pressable, Text } from "react-native"
import { Moon, Sun } from "lucide-react-native"
import { useTheme } from "@/context/ThemeContext"
import { useLanguage } from "@/context/LanguageContext"
import { colors } from "@/theme"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()

  return (
    <Pressable
      onPress={toggleTheme}
      className="flex-row items-center gap-2 rounded-lg p-2 active:opacity-70"
    >
      {theme === "dark" ? (
        <Sun size={18} color={colors.muted} />
      ) : (
        <Moon size={18} color={colors.muted} />
      )}
      <Text className="text-sm" style={{ color: colors.fgSoft }}>
        {theme === "dark" ? t.profile.lightMode : t.profile.darkMode}
      </Text>
    </Pressable>
  )
}
