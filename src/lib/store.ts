import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Language } from "@/lib/translations"

// Legacy keys (single-API), read once to migrate.
const AUTH_KEY = "auth_token"
const API_URL_KEY = "api_url"
const LANG_KEY = "lang"
const INSTANCES_KEY = "instances"
export const DEFAULT_API_URL = "https://stayup-api.r-sik.workers.dev"

/** A session on an API instance. `instances[0]` is the primary. The token lives
 *  in SecureStore (`tok_<id>`), the metadata in AsyncStorage. */
export interface Instance {
  id: string
  url: string
  name: string
  token: string
}
type InstanceMeta = Omit<Instance, "token">

export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function newId(): string {
  // expo/hermes fournit crypto.randomUUID ; repli simple sinon.
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const tokKey = (id: string) => `tok_${id}`

async function readMeta(): Promise<InstanceMeta[]> {
  const raw = await AsyncStorage.getItem(INSTANCES_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as InstanceMeta[]
  } catch {
    return []
  }
}

async function writeMeta(list: InstanceMeta[]): Promise<void> {
  await AsyncStorage.setItem(INSTANCES_KEY, JSON.stringify(list))
}

// ─── Instances ────────────────────────────────────────────────────────────────

export async function readInstances(): Promise<Instance[]> {
  const meta = await readMeta()
  if (meta.length > 0) {
    const withTokens = await Promise.all(
      meta.map(async (m) => ({
        ...m,
        token: (await SecureStore.getItemAsync(tokKey(m.id))) ?? "",
      })),
    )
    return withTokens
  }

  // Migration mono-API → liste.
  const legacyToken = await SecureStore.getItemAsync(AUTH_KEY)
  if (!legacyToken) return []
  const legacyUrl = (await AsyncStorage.getItem(API_URL_KEY)) ?? DEFAULT_API_URL
  const id = newId()
  const inst: Instance = { id, url: legacyUrl, name: hostOf(legacyUrl), token: legacyToken }
  await writeMeta([{ id, url: inst.url, name: inst.name }])
  await SecureStore.setItemAsync(tokKey(id), legacyToken)
  await SecureStore.deleteItemAsync(AUTH_KEY)
  await AsyncStorage.removeItem(API_URL_KEY)
  return [inst]
}

export async function writeInstances(list: Instance[]): Promise<void> {
  await writeMeta(list.map(({ id, url, name }) => ({ id, url, name })))
  await Promise.all(list.map((i) => SecureStore.setItemAsync(tokKey(i.id), i.token)))
}

export async function upsertPrimaryInstance(input: {
  url: string
  token: string
  name?: string
}): Promise<Instance> {
  const list = await readInstances()
  const existing = list[0]
  const primary: Instance = {
    id: existing?.id ?? newId(),
    url: input.url,
    name: input.name ?? existing?.name ?? hostOf(input.url),
    token: input.token,
  }
  await writeInstances([primary, ...list.slice(1)])
  return primary
}

export async function addInstance(input: {
  url: string
  token: string
  name: string
}): Promise<Instance> {
  const list = await readInstances()
  const inst: Instance = { id: newId(), ...input }
  await writeInstances([...list, inst])
  return inst
}

export async function removeInstance(id: string): Promise<Instance[]> {
  const list = await readInstances()
  const next = list.filter((i) => i.id !== id)
  await writeMeta(next.map(({ id: i, url, name }) => ({ id: i, url, name })))
  await SecureStore.deleteItemAsync(tokKey(id))
  return next
}

export async function renameInstance(id: string, name: string): Promise<void> {
  const meta = await readMeta()
  await writeMeta(meta.map((m) => (m.id === id ? { ...m, name } : m)))
}

export async function setPrimaryInstance(id: string): Promise<void> {
  const list = await readInstances()
  const target = list.find((i) => i.id === id)
  if (!target) return
  await writeInstances([target, ...list.filter((i) => i.id !== id)])
}

export async function updateInstanceToken(id: string, token: string): Promise<void> {
  await SecureStore.setItemAsync(tokKey(id), token)
}

export async function clearInstances(): Promise<void> {
  const meta = await readMeta()
  await Promise.all(meta.map((m) => SecureStore.deleteItemAsync(tokKey(m.id))))
  await AsyncStorage.removeItem(INSTANCES_KEY)
}

// ─── Compat mono-API : primaire ─────────────────────────────────────────────

export async function readToken(): Promise<string | null> {
  return (await readInstances())[0]?.token ?? null
}

export async function writeToken(token: string): Promise<void> {
  const url = (await readInstances())[0]?.url ?? DEFAULT_API_URL
  await upsertPrimaryInstance({ url, token })
}

export async function clearToken(): Promise<void> {
  await clearInstances()
}

export async function readApiUrl(): Promise<string> {
  return (await readInstances())[0]?.url ?? DEFAULT_API_URL
}

export async function writeApiUrl(url: string): Promise<void> {
  const list = await readInstances()
  if (list.length === 0) {
    const id = newId()
    await writeMeta([{ id, url, name: hostOf(url) }])
    return
  }
  await writeInstances([{ ...list[0], url }, ...list.slice(1)])
}

export async function resetApiUrl(): Promise<void> {
  await writeApiUrl(DEFAULT_API_URL)
}

// ─── Langue ──────────────────────────────────────────────────────────────────

export async function readLang(): Promise<Language | null> {
  const v = await AsyncStorage.getItem(LANG_KEY)
  return (v as Language) ?? null
}

export async function writeLang(lang: Language): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lang)
}

// ─── Items lus ───────────────────────────────────────────────────────────────

const READ_ITEMS_KEY = "read_items"

export async function readReadItems(): Promise<string[]> {
  const v = await AsyncStorage.getItem(READ_ITEMS_KEY)
  if (!v) return []
  try {
    return JSON.parse(v) as string[]
  } catch {
    return []
  }
}

export async function writeReadItems(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(READ_ITEMS_KEY, JSON.stringify(ids))
}
