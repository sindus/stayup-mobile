import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native"
import { Link } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { RegisterForm } from "@/components/auth/RegisterForm"
import { useLanguage } from "@/context/LanguageContext"

export default function RegisterScreen() {
  const { register, loading, error } = useAuth()
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
            <Text className="mt-1 text-gray-500 dark:text-gray-400">{t.auth.signUp}</Text>
          </View>

          <RegisterForm onSubmit={register} loading={loading} error={error} />

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t.auth.alreadyHaveAccount}
            </Text>
            <Link href="/(auth)/login">
              <Text className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {t.auth.signIn}
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
