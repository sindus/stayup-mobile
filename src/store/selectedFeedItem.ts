import { create } from "zustand"
import type { TaggedItem } from "@/types"

interface SelectedFeedItemState {
  item: TaggedItem | null
  repoUrl: string
  setItem: (item: TaggedItem | null, repoUrl?: string) => void
}

export const useSelectedFeedItemStore = create<SelectedFeedItemState>()((set) => ({
  item: null,
  repoUrl: "",
  setItem: (item, repoUrl = "") => set({ item, repoUrl }),
}))
