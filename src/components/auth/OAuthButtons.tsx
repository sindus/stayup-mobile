import { View, Pressable, Text, ActivityIndicator } from "react-native"
import { useLanguage } from "@/context/LanguageContext"

interface OAuthButtonsProps {
  onPress: (provider: "github" | "google") => Promise<void>
  loading: boolean
}

export function OAuthButtons({ onPress, loading }: OAuthButtonsProps) {
  const { t } = useLanguage()

  return (
    <View className="gap-3">
      <Pressable
        onPress={() => onPress("github")}
        disabled={loading}
        className="flex-row items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 active:opacity-80 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
      >
        {loading ? (
          <ActivityIndicator size="small" color="#6b7280" />
        ) : (
          <Text className="font-medium text-gray-800 dark:text-gray-200">
            {t.auth.continueWithGitHub}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => onPress("google")}
        disabled={loading}
        className="flex-row items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 active:opacity-80 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
      >
        {loading ? (
          <ActivityIndicator size="small" color="#6b7280" />
        ) : (
          <Text className="font-medium text-gray-800 dark:text-gray-200">
            {t.auth.continueWithGoogle}
          </Text>
        )}
      </Pressable>
    </View>
  )
}
