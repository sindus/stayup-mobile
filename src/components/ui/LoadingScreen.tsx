import { View, ActivityIndicator, Text } from "react-native"

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <ActivityIndicator size="large" color="#6366f1" />
      {message && <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">{message}</Text>}
    </View>
  )
}
