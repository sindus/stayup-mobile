import { useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { DiffViewer } from "@/components/documentation/DiffViewer"

export default function DiffScreen() {
  const { id, versionId } = useLocalSearchParams<{ id: string; versionId: string }>()
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={["top"]}>
      <DiffViewer docId={Number(id)} versionId={Number(versionId)} />
    </SafeAreaView>
  )
}
