import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Language } from "@/lib/translations"

const AUTH_KEY = "auth_token"
const LANG_KEY = "lang"
const API_URL = "https://stayup-api.r-sik.workers.dev"

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
  return API_URL
}

export async function readLang(): Promise<Language | null> {
  const v = await AsyncStorage.getItem(LANG_KEY)
  return (v as Language) ?? null
}

export async function writeLang(lang: Language): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lang)
}
