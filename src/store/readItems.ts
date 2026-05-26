import { create } from "zustand"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { TaggedItem } from "@/types"

const READ_ITEMS_KEY = "read_items"

export function getTaggedItemId(tagged: TaggedItem): string {
  return `${tagged.provider}:${tagged.item.id}`
}

interface ReadItemsState {
  readIds: Set<string>
  initialized: boolean
  init: () => Promise<void>
  markRead: (tagged: TaggedItem) => Promise<void>
  markAllRead: (items: TaggedItem[]) => Promise<void>
  cleanup: (currentIds: Set<string>) => Promise<void>
}

export const useReadItemsStore = create<ReadItemsState>()((set, get) => ({
  readIds: new Set(),
  initialized: false,

  init: async () => {
    if (get().initialized) return
    const stored = await AsyncStorage.getItem(READ_ITEMS_KEY)
    const ids: string[] = stored ? (JSON.parse(stored) as string[]) : []
    set({ readIds: new Set(ids), initialized: true })
  },

  markRead: async (tagged: TaggedItem) => {
    const id = getTaggedItemId(tagged)
    const { readIds } = get()
    if (readIds.has(id)) return
    const next = new Set(readIds)
    next.add(id)
    set({ readIds: next })
    await AsyncStorage.setItem(READ_ITEMS_KEY, JSON.stringify([...next]))
  },

  markAllRead: async (items: TaggedItem[]) => {
    const { readIds } = get()
    const next = new Set(readIds)
    items.forEach((item) => next.add(getTaggedItemId(item)))
    set({ readIds: next })
    await AsyncStorage.setItem(READ_ITEMS_KEY, JSON.stringify([...next]))
  },

  cleanup: async (currentIds: Set<string>) => {
    const { readIds } = get()
    const filtered = [...readIds].filter((id) => currentIds.has(id))
    if (filtered.length === readIds.size) return
    const next = new Set(filtered)
    set({ readIds: next })
    await AsyncStorage.setItem(READ_ITEMS_KEY, JSON.stringify(filtered))
  },
}))
