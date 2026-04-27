import { View, Text, Pressable, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LogOut } from "lucide-react-native"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"

export default function ProfileScreen() {
  const { session, logout } = useAuth()
  const { t } = useLanguage()

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={["top"]}>
      <ScrollView contentContainerClassName="p-6 gap-6">
        {/* User info */}
        <View className="items-center gap-2">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
            <Text className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {session?.name?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {session?.name}
          </Text>
          <Text className="text-sm text-gray-400">{session?.email}</Text>
        </View>

        {/* Theme */}
        <View className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t.profile.theme}
          </Text>
          <ThemeToggle />
        </View>

        {/* Language */}
        <View className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t.profile.language}
          </Text>
          <LanguageSwitcher />
        </View>

        {/* Sign out */}
        <Pressable
          onPress={logout}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-4 dark:border-red-900/30 dark:bg-red-900/10 active:opacity-80"
        >
          <LogOut size={18} color="#ef4444" />
          <Text className="font-semibold text-red-500">{t.profile.signOut}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
