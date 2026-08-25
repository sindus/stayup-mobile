import { Redirect } from "expo-router"
import { View, ActivityIndicator } from "react-native"
import { useAuth } from "@/hooks/useAuth"
import { colors } from "@/theme"

export default function Index() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="large" color={colors.peach} />
      </View>
    )
  }

  return <Redirect href={session ? "/(app)/feed" : "/(auth)/login"} />
}
