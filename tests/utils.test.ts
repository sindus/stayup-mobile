import { Linking } from "react-native"
import {
  cn,
  extractIdentifier,
  formatDate,
  stripUrlScheme,
  stripMarkdown,
  stripHtml,
  openUrl,
  providerDisplayName,
} from "../src/lib/utils"

describe("extractIdentifier", () => {
  // Le libellé riche par provider vient de `display.feedLabel` (resolveFeedLabel) ;
  // ici ce n'est plus qu'un repli générique : schéma et `www.` retirés.
  it("strips the scheme and www.", () => {
    expect(extractIdentifier("https://www.blog.example.com/feed.xml")).toBe(
      "blog.example.com/feed.xml",
    )
  })

  it("keeps the path otherwise", () => {
    expect(extractIdentifier("https://github.com/facebook/react")).toBe("github.com/facebook/react")
  })

  it("returns the string as-is when not a url", () => {
    expect(extractIdentifier("not-a-url")).toBe("not-a-url")
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

describe("providerDisplayName", () => {
  it("capitalizes the provider name", () => {
    expect(providerDisplayName("podcast")).toBe("Podcast")
  })

  it("leaves an already capitalized name untouched", () => {
    expect(providerDisplayName("RSS")).toBe("RSS")
  })

  it("returns an empty string for an empty provider", () => {
    expect(providerDisplayName("")).toBe("")
  })
})
