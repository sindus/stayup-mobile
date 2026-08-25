import { useLocalSearchParams } from "expo-router"
import { View, Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { colors } from "@/theme"

export default function FluxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center">
        <Text style={{ color: colors.muted }}>Flux #{id}</Text>
      </View>
    </SafeAreaView>
  )
}
