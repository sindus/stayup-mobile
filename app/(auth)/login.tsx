import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native"
import { Link } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { LoginForm } from "@/components/auth/LoginForm"
import { OAuthButtons } from "@/components/auth/OAuthButtons"
import { useLanguage } from "@/context/LanguageContext"

export default function LoginScreen() {
  const { login, loginOAuth, loading, error } = useAuth()
  const { t } = useLanguage()

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 dark:text-white">StayUp</Text>
            <Text className="mt-1 text-gray-500 dark:text-gray-400">{t.auth.subtitle}</Text>
          </View>

          <LoginForm onSubmit={login} loading={loading} error={error} />

          <View className="my-6 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <Text className="text-sm text-gray-400">{t.auth.or}</Text>
            <View className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </View>

          <OAuthButtons onPress={loginOAuth} loading={loading} />

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-sm text-gray-500 dark:text-gray-400">{t.auth.noAccount}</Text>
            <Link href="/(auth)/register">
              <Text className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {t.auth.signUp}
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
