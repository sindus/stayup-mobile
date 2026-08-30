import { useState } from "react"
import { View, Text, Pressable, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LogOut, Server, ChevronRight } from "lucide-react-native"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"
import { InstancesSheet } from "@/components/instances/InstancesSheet"
import { colors } from "@/theme"

export default function ProfileScreen() {
  const auth = useAuth()
  const { session, logout, instances } = auth
  const { t } = useLanguage()
  const [instancesOpen, setInstancesOpen] = useState(false)

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView contentContainerClassName="p-6 gap-6">
        {/* User info */}
        <View className="items-center gap-2">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.peach }}
          >
            <Text className="text-2xl font-semibold" style={{ color: colors.peachOn }}>
              {session?.name?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={{ fontFamily: "InstrumentSerif", fontSize: 22, color: colors.fg }}>
            {session?.name}
          </Text>
          <Text className="text-sm font-mono" style={{ color: colors.muted }}>
            {session?.email}
          </Text>
        </View>

        {/* Theme */}
        <View
          className="rounded-xl border p-4"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          <Text
            className="mb-3 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: colors.muted }}
          >
            {t.profile.theme}
          </Text>
          <ThemeToggle />
        </View>

        {/* Language */}
        <View
          className="rounded-xl border p-4"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          <Text
            className="mb-3 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: colors.muted }}
          >
            {t.profile.language}
          </Text>
          <LanguageSwitcher />
        </View>

        {/* Servers */}
        <Pressable
          onPress={() => setInstancesOpen(true)}
          className="flex-row items-center justify-between rounded-xl border p-4"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          <View className="flex-row items-center gap-2">
            <Server size={16} color={colors.muted} />
            <Text className="font-medium" style={{ color: colors.fg }}>
              {t.instances.manage}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            {instances.length > 1 && (
              <Text className="text-sm font-mono" style={{ color: colors.dim }}>
                {instances.length}
              </Text>
            )}
            <ChevronRight size={16} color={colors.muted} />
          </View>
        </Pressable>

        {/* Sign out */}
        <Pressable
          onPress={logout}
          className="flex-row items-center justify-center gap-2 rounded-xl border py-4 active:opacity-80"
          style={{ borderColor: "rgba(232, 168, 181, 0.3)", backgroundColor: colors.roseDim }}
        >
          <LogOut size={18} color={colors.rose} />
          <Text className="font-semibold" style={{ color: colors.rose }}>
            {t.profile.signOut}
          </Text>
        </Pressable>
      </ScrollView>

      <InstancesSheet visible={instancesOpen} onClose={() => setInstancesOpen(false)} auth={auth} />
    </SafeAreaView>
  )
}
