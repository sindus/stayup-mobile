import { View, Pressable, Text, ActivityIndicator } from "react-native"
import { useLanguage } from "@/context/LanguageContext"
import { colors } from "@/theme"

interface OAuthButtonsProps {
  onPress: (provider: "github" | "google") => Promise<void>
  loading: boolean
  /** Which buttons to show — from the target instance's `GET /auth/config`.
   *  Both by default, for an API too old to expose the config. */
  providers?: { github: boolean; google: boolean }
}

export function OAuthButtons({
  onPress,
  loading,
  providers = { github: true, google: true },
}: OAuthButtonsProps) {
  const { t } = useLanguage()

  if (!providers.github && !providers.google) return null

  return (
    <View className="gap-2.5">
      {providers.github && (
        <Pressable
          onPress={() => onPress("github")}
          disabled={loading}
          className="flex-row items-center justify-center gap-2 rounded-xl border py-3.5 active:opacity-80 disabled:opacity-50"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.fgSoft} />
          ) : (
            <Text className="font-medium" style={{ color: colors.fg }}>
              {t.auth.continueWithGitHub}
            </Text>
          )}
        </Pressable>
      )}

      {providers.google && (
        <Pressable
          onPress={() => onPress("google")}
          disabled={loading}
          className="flex-row items-center justify-center gap-2 rounded-xl border py-3.5 active:opacity-80 disabled:opacity-50"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.fgSoft} />
          ) : (
            <Text className="font-medium" style={{ color: colors.fg }}>
              {t.auth.continueWithGoogle}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  )
}
