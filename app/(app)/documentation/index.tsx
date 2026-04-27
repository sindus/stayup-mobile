import { SafeAreaView } from "react-native-safe-area-context"
import { Text, View } from "react-native"
import { DocList } from "@/components/documentation/DocList"
import { useLanguage } from "@/context/LanguageContext"

export default function DocumentationScreen() {
  const { t } = useLanguage()
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={["top"]}>
      <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t.documentation.myDocs}
        </Text>
      </View>
      <DocList />
    </SafeAreaView>
  )
}
