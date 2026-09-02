import { useState, useEffect, useMemo } from "react"
import { Modal, View, Text, TextInput, Pressable, ScrollView } from "react-native"
import { X, Star, Trash2, RefreshCw, Plus } from "lucide-react-native"
import { useLanguage } from "@/context/LanguageContext"
import { LoginForm } from "@/components/auth/LoginForm"
import { OAuthButtons } from "@/components/auth/OAuthButtons"
import { type AuthConfig, fetchAuthConfig } from "@/lib/api"
import { hostOf } from "@/lib/store"
import { colors } from "@/theme"
import type { useAuth } from "@/hooks/useAuth"

interface InstancesSheetProps {
  visible: boolean
  onClose: () => void
  auth: ReturnType<typeof useAuth>
  /** Instances dont la session est morte : la feuille montre un bandeau et déplie
   *  d'office le formulaire de reconnexion de la première. */
  autoReason?: { instanceId: string; instanceName: string }[]
}

function ConnectForm({
  config,
  loading,
  error,
  onPassword,
  onOAuth,
}: {
  config: AuthConfig | null
  loading: boolean
  error: string | null
  onPassword: (email: string, password: string) => void
  onOAuth: (provider: "github" | "google") => void
}) {
  const oauth = config?.oauth ?? { github: true, google: true }
  return (
    <View className="gap-3">
      {(oauth.github || oauth.google) && (
        <OAuthButtons
          onPress={async (p) => {
            onOAuth(p)
          }}
          loading={loading}
          providers={oauth}
        />
      )}
      <LoginForm
        onSubmit={async (e, p) => {
          onPassword(e, p)
        }}
        loading={loading}
        error={error}
      />
    </View>
  )
}

export function InstancesSheet({ visible, onClose, auth, autoReason }: InstancesSheetProps) {
  const { t } = useLanguage()
  const {
    instances,
    sessions,
    addInstance,
    reconnectInstance,
    removeInstance,
    renameInstance,
    setPrimary,
  } = auth

  const [adding, setAdding] = useState(false)
  const [url, setUrl] = useState("")
  const [config, setConfig] = useState<AuthConfig | null>(null)
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectId, setReconnectId] = useState<string | null>(null)

  const brokenIds = useMemo(
    () => new Set((autoReason ?? []).map((a) => a.instanceId)),
    [autoReason],
  )

  // Reconnexion poussée automatiquement : déplie d'office le formulaire de la
  // première instance concernée, sans écraser un choix déjà fait.
  useEffect(() => {
    if (autoReason && autoReason.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReconnectId((cur) => cur ?? autoReason[0].instanceId)
    }
  }, [autoReason])

  const sessionById = new Map(sessions.map((s) => [s.instanceId, s]))

  function resetAdd() {
    setAdding(false)
    setUrl("")
    setConfig(null)
    setChecked(false)
    setError(null)
  }

  async function checkUrl() {
    setBusy(true)
    setError(null)
    setConfig(await fetchAuthConfig(url.trim()).catch(() => null))
    setChecked(true)
    setBusy(false)
  }

  async function runAdd(method: Parameters<typeof addInstance>[1]) {
    setBusy(true)
    setError(null)
    const err = await addInstance(url.trim(), method)
    setBusy(false)
    if (err) setError(err)
    else resetAdd()
  }

  async function runReconnect(id: string, method: Parameters<typeof reconnectInstance>[1]) {
    setBusy(true)
    setError(null)
    const err = await reconnectInstance(id, method)
    setBusy(false)
    if (err) setError(err)
    else setReconnectId(null)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(8,10,16,0.72)" }}
        onPress={onClose}
      >
        <Pressable
          className="max-h-[85%] rounded-t-[24px] p-6"
          style={{ backgroundColor: colors.surface, paddingBottom: 34 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-4 flex-row items-start justify-between">
            <Text style={{ fontFamily: "InstrumentSerif", fontSize: 24, color: colors.fg }}>
              {t.instances.title}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </Pressable>
          </View>
          <Text className="mb-4 text-[13px]" style={{ color: colors.muted }}>
            {t.instances.subtitle}
          </Text>

          {autoReason && autoReason.length > 0 && (
            <View className="mb-4 rounded-lg px-3 py-2" style={{ backgroundColor: colors.roseDim }}>
              <Text className="text-[13px]" style={{ color: colors.rose }}>
                {t.instances.reconnectPrompt} {autoReason.map((a) => a.instanceName).join(", ")}
              </Text>
            </View>
          )}

          <ScrollView className="grow-0">
            {instances.map((inst, i) => {
              const s = sessionById.get(inst.id)
              const isPrimary = i === 0
              return (
                <View
                  key={inst.id}
                  className="mb-2 rounded-xl border p-3"
                  style={{ borderColor: colors.border }}
                >
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      defaultValue={inst.name}
                      onEndEditing={(e) => {
                        const v = e.nativeEvent.text.trim()
                        if (v && v !== inst.name) void renameInstance(inst.id, v)
                      }}
                      className="flex-1 text-sm font-medium"
                      style={{ color: colors.fg }}
                    />
                    {isPrimary && (
                      <View
                        className="rounded px-1.5 py-0.5"
                        style={{ backgroundColor: colors.peachDim }}
                      >
                        <Text className="text-[11px]" style={{ color: colors.peach }}>
                          {t.instances.primary}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="mt-0.5 text-[12px] font-mono" style={{ color: colors.dim }}>
                    {hostOf(inst.url)}
                  </Text>
                  {(s?.expired || brokenIds.has(inst.id)) && (
                    <Text className="mt-1 text-[12px]" style={{ color: colors.rose }}>
                      {t.instances.expired}
                    </Text>
                  )}

                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {!isPrimary && (
                      <Pressable
                        onPress={() => void setPrimary(inst.id)}
                        className="flex-row items-center gap-1 rounded border px-2 py-1"
                        style={{ borderColor: colors.border }}
                      >
                        <Star size={12} color={colors.fgSoft} />
                        <Text className="text-[12px]" style={{ color: colors.fgSoft }}>
                          {t.instances.makePrimary}
                        </Text>
                      </Pressable>
                    )}
                    {(s?.expired || brokenIds.has(inst.id)) && (
                      <Pressable
                        onPress={() => setReconnectId(reconnectId === inst.id ? null : inst.id)}
                        className="flex-row items-center gap-1 rounded border px-2 py-1"
                        style={{ borderColor: colors.border }}
                      >
                        <RefreshCw size={12} color={colors.fgSoft} />
                        <Text className="text-[12px]" style={{ color: colors.fgSoft }}>
                          {t.instances.reconnect}
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => void removeInstance(inst.id)}
                      className="flex-row items-center gap-1 rounded border px-2 py-1"
                      style={{ borderColor: colors.border }}
                    >
                      <Trash2 size={12} color={colors.rose} />
                      <Text className="text-[12px]" style={{ color: colors.rose }}>
                        {t.instances.remove}
                      </Text>
                    </Pressable>
                  </View>

                  {reconnectId === inst.id && (
                    <View className="mt-3 border-t pt-3" style={{ borderColor: colors.border }}>
                      <ConnectForm
                        config={null}
                        loading={busy}
                        error={error}
                        onPassword={(e, p) =>
                          void runReconnect(inst.id, { kind: "password", email: e, password: p })
                        }
                        onOAuth={(provider) =>
                          void runReconnect(inst.id, { kind: "oauth", provider })
                        }
                      />
                    </View>
                  )}
                </View>
              )
            })}

            {!adding ? (
              <Pressable
                onPress={() => setAdding(true)}
                className="mt-2 flex-row items-center gap-1.5 self-start rounded-md border px-3 py-2"
                style={{ borderColor: colors.border }}
              >
                <Plus size={14} color={colors.fg} />
                <Text className="text-[13px]" style={{ color: colors.fg }}>
                  {t.instances.add}
                </Text>
              </Pressable>
            ) : (
              <View className="mt-2 rounded-xl border p-3" style={{ borderColor: colors.border }}>
                <Text className="text-[12px] font-medium" style={{ color: colors.fgSoft }}>
                  {t.instances.urlLabel}
                </Text>
                <View className="mt-1 flex-row gap-2">
                  <TextInput
                    autoFocus
                    value={url}
                    onChangeText={(v) => {
                      setUrl(v)
                      setChecked(false)
                    }}
                    placeholder={t.instances.urlPlaceholder}
                    placeholderTextColor={colors.dim}
                    autoCapitalize="none"
                    keyboardType="url"
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                    style={{
                      borderColor: colors.border,
                      color: colors.fg,
                      backgroundColor: colors.bg,
                    }}
                  />
                  <Pressable
                    disabled={busy || !url.trim()}
                    onPress={() => void checkUrl()}
                    className="rounded-md px-3 py-2"
                    style={{
                      backgroundColor: colors.peach,
                      opacity: busy || !url.trim() ? 0.5 : 1,
                    }}
                  >
                    <Text className="font-semibold" style={{ color: colors.peachOn }}>
                      {t.instances.next}
                    </Text>
                  </Pressable>
                </View>

                {checked && (
                  <View className="mt-3">
                    <ConnectForm
                      config={config}
                      loading={busy}
                      error={error}
                      onPassword={(e, p) =>
                        void runAdd({ kind: "password", email: e, password: p })
                      }
                      onOAuth={(provider) => void runAdd({ kind: "oauth", provider })}
                    />
                  </View>
                )}

                <Pressable onPress={resetAdd} className="mt-3">
                  <Text className="text-[12px]" style={{ color: colors.muted }}>
                    {t.instances.cancel}
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
