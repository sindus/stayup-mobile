import { Linking } from "react-native"
import {
  cn,
  extractIdentifier,
  normalizeIdentifier,
  toRepositoryUrl,
  formatDate,
  stripUrlScheme,
  stripMarkdown,
  stripHtml,
  openUrl,
} from "../src/lib/utils"
import type { Provider } from "../src/types"

describe("extractIdentifier", () => {
  it("extracts owner/repo for changelog", () => {
    expect(extractIdentifier("https://github.com/facebook/react/", "changelog")).toBe(
      "facebook/react",
    )
  })

  it("extracts channel handle for youtube", () => {
    expect(extractIdentifier("https://www.youtube.com/@fireship", "youtube")).toBe("@fireship")
  })

  it("extracts hostname+path for rss", () => {
    expect(extractIdentifier("https://blog.example.com/feed.xml", "rss")).toBe(
      "blog.example.com/feed.xml",
    )
  })

  it("extracts hostname for scrap", () => {
    expect(extractIdentifier("https://example.com/articles", "scrap")).toBe("example.com")
  })

  it("returns original url on parse error", () => {
    expect(extractIdentifier("not-a-url", "changelog")).toBe("not-a-url")
  })
})

describe("normalizeIdentifier", () => {
  it("normalizes a full GitHub URL to owner/repo for changelog", () => {
    expect(normalizeIdentifier("https://github.com/vercel/next.js", "changelog")).toBe(
      "vercel/next.js",
    )
  })

  it("strips .git suffix for changelog", () => {
    expect(normalizeIdentifier("facebook/react.git", "changelog")).toBe("facebook/react")
  })

  it("extracts handle from youtube URL", () => {
    expect(normalizeIdentifier("https://www.youtube.com/@fireship", "youtube")).toBe("fireship")
  })

  it("strips @ prefix from youtube handle", () => {
    expect(normalizeIdentifier("@fireship", "youtube")).toBe("fireship")
  })

  it("trims rss url as-is", () => {
    expect(normalizeIdentifier("  https://example.com/feed.xml  ", "rss")).toBe(
      "https://example.com/feed.xml",
    )
  })
})

describe("toRepositoryUrl", () => {
  it("builds GitHub URL for changelog", () => {
    expect(toRepositoryUrl("facebook/react", "changelog")).toBe(
      "https://github.com/facebook/react/",
    )
  })

  it("builds YouTube URL for youtube", () => {
    expect(toRepositoryUrl("fireship", "youtube")).toBe("https://www.youtube.com/@fireship")
  })

  it("returns identifier as-is for rss", () => {
    expect(toRepositoryUrl("https://example.com/feed", "rss")).toBe("https://example.com/feed")
  })
})

describe("formatDate", () => {
  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("")
  })

  it("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("")
  })

  it("formats a valid date string", () => {
    const result = formatDate("2024-01-15T10:30:00Z")
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })
})

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("ignores falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b")
  })

  it("supports conditional objects", () => {
    expect(cn({ a: true, b: false })).toBe("a")
  })
})

describe("stripUrlScheme", () => {
  it("strips https:// and www.", () => {
    expect(stripUrlScheme("https://www.example.com/blog")).toBe("example.com/blog")
  })

  it("strips http://", () => {
    expect(stripUrlScheme("http://example.com")).toBe("example.com")
  })

  it("strips a leading www. without a scheme", () => {
    expect(stripUrlScheme("www.example.com")).toBe("example.com")
  })

  it("leaves a bare host untouched", () => {
    expect(stripUrlScheme("example.com")).toBe("example.com")
  })
})

describe("extractIdentifier — unknown provider", () => {
  it("returns the url as-is", () => {
    expect(extractIdentifier("https://example.com/x", "unknown" as Provider)).toBe(
      "https://example.com/x",
    )
  })
})

describe("stripMarkdown", () => {
  it("removes heading markers", () => {
    expect(stripMarkdown("## Titre")).toBe("Titre")
  })

  it("unwraps bold and italic", () => {
    expect(stripMarkdown("**gras** et *italique*")).toBe("gras et italique")
  })

  it("unwraps inline code", () => {
    expect(stripMarkdown("appelle `npm test`")).toBe("appelle npm test")
  })

  it("keeps only the link label", () => {
    expect(stripMarkdown("voir [la doc](https://example.com)")).toBe("voir la doc")
  })

  it("converts list markers to bullets", () => {
    expect(stripMarkdown("- un\n* deux")).toBe("• un\n• deux")
  })
})

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Bonjour   <b>toi</b></p>")).toBe("Bonjour toi")
  })

  it("decodes the common entities", () => {
    expect(stripHtml("a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;&nbsp;f")).toBe(
      `a & b <c> "d" 'e' f`,
    )
  })
})

describe("openUrl", () => {
  it("delegates to Linking.openURL", async () => {
    await openUrl("https://example.com")
    expect(Linking.openURL).toHaveBeenCalledWith("https://example.com")
  })
})
