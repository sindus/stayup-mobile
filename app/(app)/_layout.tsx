import { Tabs, Redirect } from "expo-router"
import { BookOpen, Rss, User } from "lucide-react-native"
import { useAuth } from "@/hooks/useAuth"
import { View, ActivityIndicator } from "react-native"

export default function AppLayout() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
        },
      }}
    >
      <Tabs.Screen
        name="feed/index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => <Rss color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="documentation/index"
        options={{
          title: "Docs",
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="feed/flux/[id]" options={{ href: null }} />
      <Tabs.Screen name="documentation/[id]" options={{ href: null }} />
      <Tabs.Screen name="documentation/[id]/history" options={{ href: null }} />
      <Tabs.Screen name="documentation/[id]/diff/[versionId]" options={{ href: null }} />
    </Tabs>
  )
}
