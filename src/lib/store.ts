import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Language } from "@/lib/translations"

const AUTH_KEY = "auth_token"
const LANG_KEY = "lang"
const API_URL_KEY = "api_url"
const DEFAULT_API_URL = "https://stayup-api.r-sik.workers.dev"

export async function readToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_KEY)
}

export async function writeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_KEY, token)
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_KEY)
}

export async function readApiUrl(): Promise<string> {
  const v = await AsyncStorage.getItem(API_URL_KEY)
  return v ?? DEFAULT_API_URL
}

export async function writeApiUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(API_URL_KEY, url)
}

export async function resetApiUrl(): Promise<void> {
  await AsyncStorage.removeItem(API_URL_KEY)
}

export async function readLang(): Promise<Language | null> {
  const v = await AsyncStorage.getItem(LANG_KEY)
  return (v as Language) ?? null
}

export async function writeLang(lang: Language): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lang)
}

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
