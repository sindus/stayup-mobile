import { clsx, type ClassValue } from "clsx"
import { Linking } from "react-native"
import type { Provider } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return ""
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

export function extractIdentifier(url: string, provider: Provider): string {
  try {
    const u = new URL(url)
    switch (provider) {
      case "changelog": {
        const parts = u.pathname.replace(/^\//, "").split("/")
        return parts.slice(0, 2).join("/")
      }
      case "youtube":
        return u.pathname.replace(/^\//, "")
      case "rss":
        return u.hostname + u.pathname
      case "scrap":
        return u.hostname
      default:
        return url
    }
  } catch {
    return url
  }
}

export function normalizeIdentifier(value: string, provider: Provider): string {
  const trimmed = value.trim()
  if (provider === "changelog") {
    const match = trimmed.match(/github\.com\/([^/]+\/[^/]+)/i)
    if (match) return match[1].replace(/\.git$/, "").replace(/\/$/, "")
    return trimmed
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "")
  }
  if (provider === "youtube") {
    const match = trimmed.match(/youtube\.com\/(?:@|channel\/|user\/)([^/?\s]+)/i)
    if (match) return match[1]
    return trimmed.replace(/^@/, "")
  }
  return trimmed
}

export function toRepositoryUrl(identifier: string, provider: Provider): string {
  switch (provider) {
    case "changelog":
      return `https://github.com/${identifier}/`
    case "youtube":
      return `https://www.youtube.com/@${identifier}`
    default:
      return identifier
  }
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .trim()
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export async function openUrl(url: string): Promise<void> {
  await Linking.openURL(url)
}
