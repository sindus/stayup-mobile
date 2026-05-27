import { useState } from "react"
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView as RNSafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { DocList } from "@/components/documentation/DocList"
import { useLanguage } from "@/context/LanguageContext"
import { createDocRequest } from "@/lib/api"
import { readToken, readApiUrl } from "@/lib/store"

export default function DocumentationScreen() {
  const { t } = useLanguage()
  const [modalOpen, setModalOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    setError(null)
    setPending(true)
    try {
      const [token, apiUrl] = await Promise.all([readToken(), readApiUrl()])
      if (!token) throw new Error(t.common.error)
      await createDocRequest({ url }, token, apiUrl)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error)
    } finally {
      setPending(false)
    }
  }

  function handleClose() {
    setModalOpen(false)
    setUrl("")
    setError(null)
    setSuccess(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={["top"]}>
      <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t.documentation.myDocs}
        </Text>
        <Pressable
          onPress={() => setModalOpen(true)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 dark:border-gray-700"
        >
          <Text className="text-xs text-gray-700 dark:text-gray-300">
            {t.documentation.requestBtn}
          </Text>
        </Pressable>
      </View>

      <DocList />

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Pressable className="flex-1 bg-black/50 justify-center px-6" onPress={handleClose}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <RNSafeAreaView className="rounded-2xl bg-white dark:bg-gray-900 p-6">
                <Text className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                  {t.documentation.requestTitle}
                </Text>

                {success ? (
                  <ScrollView>
                    <Text className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {t.documentation.requestSuccess}
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {t.documentation.requestSuccessDesc}
                    </Text>
                    <Pressable
                      onPress={handleClose}
                      className="rounded-lg bg-indigo-600 px-4 py-2 items-center"
                    >
                      <Text className="text-sm font-medium text-white">{t.common.cancel}</Text>
                    </Pressable>
                  </ScrollView>
                ) : (
                  <>
                    <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t.documentation.requestUrlLabel}
                    </Text>
                    <TextInput
                      value={url}
                      onChangeText={setUrl}
                      placeholder={t.documentation.requestUrlPlaceholder}
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      keyboardType="url"
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white mb-3"
                    />
                    {error && <Text className="text-xs text-red-500 mb-3">{error}</Text>}
                    <View className="flex-row gap-2 justify-end">
                      <Pressable
                        onPress={handleClose}
                        className="rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-700"
                      >
                        <Text className="text-sm text-gray-700 dark:text-gray-300">
                          {t.common.cancel}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handleSubmit}
                        disabled={pending || !url.trim()}
                        className="rounded-lg bg-indigo-600 px-4 py-2 disabled:opacity-50"
                      >
                        <Text className="text-sm font-medium text-white">
                          {pending ? "…" : t.documentation.requestSubmit}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </RNSafeAreaView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}
