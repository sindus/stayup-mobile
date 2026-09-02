import { Tabs, Redirect } from "expo-router"
import { Rss, User } from "lucide-react-native"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import { View, ActivityIndicator } from "react-native"
import { colors } from "@/theme"

export default function AppLayout() {
  const { session, sessions, loading } = useAuth()
  const { t } = useLanguage()

  // Au moins un serveur suivi a une session morte → pastille rouge sur l'onglet
  // Profil (le seul endroit « à côté du profil » sur mobile). Le détail par
  // serveur et la reconnexion sont dans Profil › Serveurs.
  const anyServerDead = sessions.some((s) => s.expired)

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="large" color={colors.peach} />
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
        tabBarActiveTintColor: colors.peach,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bgSoft,
          borderTopWidth: 1,
          borderTopColor: colors.borderSoft,
        },
      }}
    >
      <Tabs.Screen
        name="feed/index"
        options={{
          title: t.tabs.feed,
          tabBarIcon: ({ color, size }) => <Rss color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color, size }) => (
            <View>
              <User color={color} size={size} />
              {anyServerDead && (
                <View
                  testID="server-status-alert"
                  accessibilityLabel={t.serverStatus.disconnected}
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -3,
                    width: 9,
                    height: 9,
                    borderRadius: 9999,
                    backgroundColor: colors.rose,
                    borderWidth: 1.5,
                    borderColor: colors.bgSoft,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen name="feed/flux/[id]" options={{ href: null }} />
      <Tabs.Screen name="feed/detail" options={{ href: null }} />
    </Tabs>
  )
}
