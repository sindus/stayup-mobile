import { extractIdentifier, normalizeIdentifier, toRepositoryUrl, formatDate } from "../src/lib/utils"

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
    expect(normalizeIdentifier("https://github.com/vercel/next.js", "changelog")).toBe("vercel/next.js")
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
    expect(toRepositoryUrl("facebook/react", "changelog")).toBe("https://github.com/facebook/react/")
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
