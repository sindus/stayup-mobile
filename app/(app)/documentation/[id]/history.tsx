import { useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { HistoryList } from "@/components/documentation/HistoryList"

export default function HistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={["top"]}>
      <HistoryList docId={Number(id)} />
    </SafeAreaView>
  )
}
