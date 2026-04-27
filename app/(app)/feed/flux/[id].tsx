import { useLocalSearchParams } from "expo-router"
import { View, Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function FluxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Flux #{id}</Text>
      </View>
    </SafeAreaView>
  )
}
