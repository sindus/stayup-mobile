export type Provider = "changelog" | "youtube" | "rss" | "scrap"

export interface UserRepository {
  id: string
  userId: string
  repositoryId: number
  provider: Provider
  url: string
  identifier: string
  config: Record<string, unknown>
  createdAt: string
}

export interface ChangelogItem {
  id: number
  repository_id: number
  content: string
  diff: string | null
  datetime: string | null
  executed_at: string
  success: boolean
  version: string
}

export interface YoutubeItemContent {
  title: string
  thumbnail: string
  url: string
  link?: string
}

export interface YoutubeItem {
  id: number
  repository_id: number
  version: string
  content: string
  diff: string | null
  datetime: string | null
  executed_at: string
  success: boolean
}

export interface RssItemContent {
  version: string
  title: string
  link: string
  summary: string
}

export interface RssItem {
  id: number
  repository_id: number
  content: string
  datetime: string | null
  executed_at: string
  success: boolean
}

export interface ScrapItemParams {
  url: string
  articles_selector: string
  content_selector: string
  [key: string]: string
}

export interface ScrapItem {
  id: number
  repository_id: number
  content: string
  params: ScrapItemParams | string
  executed_at: string
  success: boolean
}

export type TaggedItem =
  | { provider: "changelog"; item: ChangelogItem }
  | { provider: "youtube"; item: YoutubeItem }
  | { provider: "rss"; item: RssItem }
  | { provider: "scrap"; item: ScrapItem }

export type ConnectorItem = ChangelogItem | YoutubeItem | RssItem | ScrapItem

export interface ConnectorData {
  connectors: {
    changelog?: ChangelogItem[]
    youtube?: YoutubeItem[]
    rss?: RssItem[]
    scrap?: ScrapItem[]
  }
}

export interface ScrapRepository {
  id: number
  url: string
  config: {
    articles_selector?: string
    content_selector?: string
    [key: string]: unknown
  }
  created_at: string
  is_subscribed: boolean
}

export interface ScrapRequest {
  id: string
  user_id: string
  user_email: string
  url: string
  status: "pending" | "approved" | "rejected"
  created_at: string
}
