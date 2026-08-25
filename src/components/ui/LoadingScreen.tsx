import { View, ActivityIndicator, Text } from "react-native"
import { colors } from "@/theme"

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator size="large" color={colors.peach} />
      {message && (
        <Text className="mt-3 text-sm" style={{ color: colors.muted }}>
          {message}
        </Text>
      )}
    </View>
  )
}
