import { XMLParser } from "fast-xml-parser"
import type { Provider } from "@/types"

export interface OpmlFlux {
  provider: Provider
  url: string
  identifier: string
}

const KNOWN_PROVIDERS: Provider[] = ["changelog", "youtube", "rss", "scrap"]

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** Serializes a flux list to an OPML document (the standard XML format for feed lists). */
export function buildOpml(fluxes: OpmlFlux[], title: string): string {
  const outlines = fluxes
    .map(
      (f) =>
        `    <outline text="${escapeXml(f.identifier)}" category="${f.provider}" xmlUrl="${escapeXml(f.url)}"/>`,
    )
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(title)}</title>
  </head>
  <body>
${outlines}
  </body>
</opml>
`
}

type OutlineNode = { text?: string; title?: string; category?: string; xmlUrl?: string }

/** Parses an OPML document back into a flux list. Unknown/malformed outlines are dropped. */
export function parseOpml(xml: string): OpmlFlux[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" })

  let result: unknown
  try {
    result = parser.parse(xml, true)
  } catch {
    return []
  }

  const body = (result as { opml?: { body?: { outline?: OutlineNode | OutlineNode[] } } })?.opml
    ?.body
  if (!body?.outline) return []

  const outlines = Array.isArray(body.outline) ? body.outline : [body.outline]

  return outlines
    .map((el) => ({
      provider: el.category as Provider,
      url: el.xmlUrl ?? "",
      identifier: el.text ?? el.title ?? "",
    }))
    .filter((f): f is OpmlFlux => KNOWN_PROVIDERS.includes(f.provider) && f.url.length > 0)
}
