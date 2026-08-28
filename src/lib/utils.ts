import { clsx, type ClassValue } from "clsx"
import { Linking } from "react-native"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function stripUrlScheme(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/^www\./, "")
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return ""
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

/** Libellé court d'un flux : le schéma retiré. Le libellé riche par provider
 *  vient de `display.feedLabel` du template (voir resolveFeedLabel). */
export function extractIdentifier(url: string): string {
  return stripUrlScheme(url)
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

/** Libellé de repli pour un provider sans traduction connue de l'app (mêmes règles que
 *  le fallback de displayName côté API — voir stayup-api/src/db/providerRegistry.ts). */
export function providerDisplayName(provider: string): string {
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}
