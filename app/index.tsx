import { Redirect } from "expo-router"
import { View, ActivityIndicator } from "react-native"
import { useAuth } from "@/hooks/useAuth"

export default function Index() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <Redirect href={session ? "/(app)/feed" : "/(auth)/login"} />
}
