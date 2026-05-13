import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLanguage } from "@/context/LanguageContext"

type FormData = { name: string; email: string; password: string }

interface RegisterFormProps {
  onSubmit: (name: string, email: string, password: string) => Promise<void>
  loading: boolean
  error: string | null
}

export function RegisterForm({ onSubmit, loading, error }: RegisterFormProps) {
  const { t } = useLanguage()
  const schema = z.object({
    name: z.string().min(1, t.auth.nameRequired),
    email: z.string().email(t.auth.emailInvalid),
    password: z.string().min(8, t.auth.passwordTooShort),
  })
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const submit = handleSubmit((data) => onSubmit(data.name, data.email, data.password))

  return (
    <View className="gap-4">
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.auth.name}</Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              autoComplete="name"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder={t.auth.namePlaceholder}
              placeholderTextColor="#9ca3af"
            />
          )}
        />
        {errors.name && <Text className="text-xs text-red-500">{errors.name.message}</Text>}
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.auth.email}</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
            />
          )}
        />
        {errors.email && <Text className="text-xs text-red-500">{errors.email.message}</Text>}
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.auth.password}</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              secureTextEntry
              autoComplete="new-password"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
            />
          )}
        />
        {errors.password && <Text className="text-xs text-red-500">{errors.password.message}</Text>}
      </View>

      {error && (
        <View className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
          <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
        </View>
      )}

      <Pressable
        onPress={submit}
        disabled={loading}
        className="items-center rounded-lg bg-indigo-600 py-3 active:opacity-80 disabled:opacity-50"
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text className="font-semibold text-white">{t.auth.signUp}</Text>
        )}
      </Pressable>
    </View>
  )
}
