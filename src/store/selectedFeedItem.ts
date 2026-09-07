import { create } from "zustand"
import type { TaggedItem } from "@/types"
import type { ProviderTemplate } from "@/lib/providerTemplate"

interface SelectedFeedItemState {
  item: TaggedItem | null
  repoUrl: string
  /** Display template of the open item's provider (null = generic rendering). */
  template: ProviderTemplate | null
  /** Source (repository) de l'item, telle qu'un template la lit via `$source.*`. */
  source: Record<string, unknown> | undefined
  setItem: (
    item: TaggedItem | null,
    opts?: {
      repoUrl?: string
      template?: ProviderTemplate | null
      source?: Record<string, unknown>
    },
  ) => void
}

export const useSelectedFeedItemStore = create<SelectedFeedItemState>()((set) => ({
  item: null,
  repoUrl: "",
  template: null,
  source: undefined,
  setItem: (item, opts = {}) =>
    set({
      item,
      repoUrl: opts.repoUrl ?? "",
      template: opts.template ?? null,
      source: opts.source,
    }),
}))
