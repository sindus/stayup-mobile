import { useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { DocViewer } from "@/components/documentation/DocViewer"

export default function DocScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={["top"]}>
      <DocViewer docId={Number(id)} />
    </SafeAreaView>
  )
}
