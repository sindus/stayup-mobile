import { create } from "zustand"

export type FeedArticle = {
  title: string
  url?: string
  content?: string
  thumbnail?: string
  provider: "changelog" | "youtube" | "rss" | "scrap"
  date: string
}

interface FeedReaderState {
  articles: FeedArticle[]
  index: number
  open: (articles: FeedArticle[], index: number) => void
}

export const useFeedReaderStore = create<FeedReaderState>()((set) => ({
  articles: [],
  index: 0,
  open: (articles, index) => set({ articles, index }),
}))
