import { Linking, RefreshControl, View } from "react-native"
import { screen, fireEvent, waitFor } from "@testing-library/react-native"
import { UnifiedFeedList } from "@/components/feed/UnifiedFeedList"
import type { ChangelogItem, RssItem, ScrapItem, TaggedItem, YoutubeItem } from "@/types"
import { renderWithProviders } from "./render"

let openURL: jest.SpyInstance

beforeEach(() => {
  openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true)
})

afterEach(() => openURL.mockRestore())

function changelog(overrides: Partial<ChangelogItem> = {}): ChangelogItem {
  return {
    id: 1,
    repository_id: 10,
    content: "## Titre\r\nCorps du changelog",
    datetime: "2026-03-01T10:00:00Z",
    executed_at: "2026-03-01T11:00:00Z",
    success: true,
    version: "v1.2.3",
    ...overrides,
  }
}

function youtube(content: unknown, overrides: Partial<YoutubeItem> = {}): YoutubeItem {
  return {
    id: 2,
    repository_id: 11,
    version: "1",
    content: typeof content === "string" ? content : JSON.stringify(content),
    datetime: "2026-02-01T10:00:00Z",
    executed_at: "2026-02-01T11:00:00Z",
    success: true,
    ...overrides,
  }
}

function rss(content: unknown, overrides: Partial<RssItem> = {}): RssItem {
  return {
    id: 3,
    repository_id: 12,
    content: typeof content === "string" ? content : JSON.stringify(content),
    datetime: "2026-01-01T10:00:00Z",
    executed_at: "2026-01-01T11:00:00Z",
    success: true,
    ...overrides,
  }
}

function scrap(params: ScrapItem["params"], overrides: Partial<ScrapItem> = {}): ScrapItem {
  return {
    id: 4,
    repository_id: 13,
    content: "Contenu scrapé",
    params,
    executed_at: "2025-12-01T11:00:00Z",
    success: true,
    ...overrides,
  }
}

function tag(provider: string, item: unknown): TaggedItem {
  return { provider, item } as TaggedItem
}

describe("UnifiedFeedList — état vide", () => {
  it("shows the empty message when there is nothing to display", () => {
    renderWithProviders(<UnifiedFeedList items={[]} />)
    expect(screen.getByText("Aucun contenu disponible.")).toBeTruthy()
  })

  it("does not show the empty message while loading", () => {
    renderWithProviders(<UnifiedFeedList items={[]} loading />)
    expect(screen.queryByText("Aucun contenu disponible.")).toBeNull()
  })
})

describe("UnifiedFeedList — tri", () => {
  it("orders every provider together, newest first", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[
          tag("changelog", changelog()),
          tag("youtube", youtube({ title: "Vidéo" })),
          tag("rss", rss({ title: "Article", link: "https://blog.example.com/a" })),
          tag(
            "scrap",
            scrap({ url: "https://example.com", articles_selector: "", content_selector: "" }),
          ),
        ]}
        repositories={[{ repository_id: 10, url: "https://github.com/facebook/react" }]}
      />,
    )

    const titles = ["facebook/react", "Vidéo", "Article", "https://example.com"]
    for (const title of titles) expect(screen.getByText(title)).toBeTruthy()
  })
})

describe("ChangelogEntry", () => {
  it("shows the repo name, version and stripped content", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[tag("changelog", changelog())]}
        repositories={[{ repository_id: 10, url: "https://github.com/facebook/react" }]}
      />,
    )

    expect(screen.getByText("facebook/react")).toBeTruthy()
    expect(screen.getByText("v1.2.3")).toBeTruthy()
    expect(screen.getByText("Titre Corps du changelog")).toBeTruthy()
  })

  it("falls back to the repository label when the repository url is unknown", () => {
    renderWithProviders(<UnifiedFeedList items={[tag("changelog", changelog())]} />)

    expect(screen.getByText("dépôt")).toBeTruthy()
    expect(screen.getByText("v1.2.3")).toBeTruthy()
  })

  it("does not open a release page when the repository url is unknown", () => {
    renderWithProviders(<UnifiedFeedList items={[tag("changelog", changelog())]} />)

    fireEvent.press(screen.getByText("v1.2.3"))
    expect(openURL).not.toHaveBeenCalled()
  })

  it("opens the release page when no press handler is given", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[tag("changelog", changelog())]}
        repositories={[{ repository_id: 10, url: "https://github.com/facebook/react" }]}
      />,
    )

    fireEvent.press(screen.getByText("v1.2.3"))
    expect(openURL).toHaveBeenCalledWith("https://github.com/facebook/react/releases/tag/v1.2.3")
  })

  it("prefers the press handler over opening the browser", () => {
    const onPressItem = jest.fn()
    renderWithProviders(
      <UnifiedFeedList items={[tag("changelog", changelog())]} onPressItem={onPressItem} />,
    )

    fireEvent.press(screen.getByText("v1.2.3"))
    expect(onPressItem).toHaveBeenCalledWith({ provider: "changelog", item: changelog() })
    expect(openURL).not.toHaveBeenCalled()
  })

  it("hides the content block when the changelog is empty", () => {
    renderWithProviders(<UnifiedFeedList items={[tag("changelog", changelog({ content: "" }))]} />)
    expect(screen.queryByText("Titre Corps du changelog")).toBeNull()
  })
})

describe("YoutubeEntry", () => {
  it("shows the title and channel handle", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[
          tag(
            "youtube",
            youtube({
              title: "Nouvelle vidéo",
              url: "https://www.youtube.com/@fireship",
              thumbnail: "https://img.example.com/t.jpg",
            }),
          ),
        ]}
      />,
    )

    expect(screen.getByText("Nouvelle vidéo")).toBeTruthy()
    expect(screen.getByText("@fireship")).toBeTruthy()
  })

  it("derives the channel from the last path segment", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[
          tag("youtube", youtube({ title: "V", url: "https://www.youtube.com/channel/UC123" })),
        ]}
      />,
    )
    expect(screen.getByText("UC123")).toBeTruthy()
  })

  it("keeps a malformed channel url as-is", () => {
    renderWithProviders(
      <UnifiedFeedList items={[tag("youtube", youtube({ title: "V", url: "pas-une-url" }))]} />,
    )
    expect(screen.getByText("pas-une-url")).toBeTruthy()
  })

  it("shows a placeholder when there is no thumbnail", () => {
    renderWithProviders(<UnifiedFeedList items={[tag("youtube", youtube({ title: "V" }))]} />)
    expect(screen.getByText("▶")).toBeTruthy()
  })

  it("falls back to the no-title label when the payload is malformed", () => {
    renderWithProviders(<UnifiedFeedList items={[tag("youtube", youtube("{cassé"))]} />)
    expect(screen.getByText("Sans titre")).toBeTruthy()
  })

  it("opens link in priority over url", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[
          tag(
            "youtube",
            youtube({
              title: "V",
              url: "https://www.youtube.com/@a",
              link: "https://youtu.be/xyz",
            }),
          ),
        ]}
      />,
    )

    fireEvent.press(screen.getByText("V"))
    expect(openURL).toHaveBeenCalledWith("https://youtu.be/xyz")
  })

  it("opens url when link is absent", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[tag("youtube", youtube({ title: "V", url: "https://www.youtube.com/@a" }))]}
      />,
    )

    fireEvent.press(screen.getByText("V"))
    expect(openURL).toHaveBeenCalledWith("https://www.youtube.com/@a")
  })
})

describe("RssEntry", () => {
  it("shows the title, source host and summary", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[
          tag(
            "rss",
            rss({
              title: "Mon article",
              link: "https://www.blog.example.com/a",
              summary: "Un résumé",
            }),
          ),
        ]}
      />,
    )

    expect(screen.getByText("Mon article")).toBeTruthy()
    expect(screen.getByText("blog.example.com")).toBeTruthy()
    expect(screen.getByText("Un résumé")).toBeTruthy()
  })

  it("keeps a malformed link as the source label", () => {
    renderWithProviders(
      <UnifiedFeedList items={[tag("rss", rss({ title: "A", link: "pas-une-url" }))]} />,
    )
    expect(screen.getByText("pas-une-url")).toBeTruthy()
  })

  it("falls back to the no-title label when the payload is malformed", () => {
    renderWithProviders(<UnifiedFeedList items={[tag("rss", rss("{cassé"))]} />)
    expect(screen.getByText("Sans titre")).toBeTruthy()
  })

  it("opens the article link", () => {
    renderWithProviders(
      <UnifiedFeedList items={[tag("rss", rss({ title: "A", link: "https://example.com/a" }))]} />,
    )

    fireEvent.press(screen.getByText("A"))
    expect(openURL).toHaveBeenCalledWith("https://example.com/a")
  })
})

describe("ScrapEntry", () => {
  it("shows the scraped url and content", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[
          tag(
            "scrap",
            scrap({
              url: "https://example.com/blog",
              articles_selector: "a",
              content_selector: "p",
            }),
          ),
        ]}
      />,
    )

    expect(screen.getByText("https://example.com/blog")).toBeTruthy()
    expect(screen.getByText("Contenu scrapé")).toBeTruthy()
  })

  it("parses params provided as a JSON string", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[tag("scrap", scrap(JSON.stringify({ url: "https://example.com/x" })))]}
      />,
    )
    expect(screen.getByText("https://example.com/x")).toBeTruthy()
  })

  it("tolerates malformed params", () => {
    renderWithProviders(<UnifiedFeedList items={[tag("scrap", scrap("{cassé"))]} />)
    expect(screen.getByText("Contenu scrapé")).toBeTruthy()
  })

  it("hides the content block when empty", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[tag("scrap", scrap(JSON.stringify({ url: "u" }), { content: "" }))]}
      />,
    )
    expect(screen.queryByText("Contenu scrapé")).toBeNull()
  })

  it("opens the scraped url", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[tag("scrap", scrap(JSON.stringify({ url: "https://example.com/x" })))]}
      />,
    )

    fireEvent.press(screen.getByText("https://example.com/x"))
    expect(openURL).toHaveBeenCalledWith("https://example.com/x")
  })
})

describe("GenericEntry — provider inconnu de l'app", () => {
  it("shows the provider label, content excerpt and date", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[
          tag("podcast", {
            id: 5,
            repository_id: 14,
            content: "Épisode du jour",
            executed_at: "2026-04-01T11:00:00Z",
          }),
        ]}
      />,
    )

    expect(screen.getByText("Épisode du jour")).toBeTruthy()
    expect(screen.getByText("Podcast")).toBeTruthy()
  })
})

/** Opacités appliquées aux conteneurs d'items (une par item rendu). */
function itemOpacities(): number[] {
  return screen
    .UNSAFE_getAllByType(View)
    .map((node) => node.props.style?.opacity)
    .filter((o: unknown): o is number => typeof o === "number")
}

describe("UnifiedFeedList — dates de repli", () => {
  it("falls back to executed_at when datetime is null", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[
          tag("changelog", changelog({ datetime: null })),
          tag("youtube", youtube({ title: "V" }, { datetime: null })),
          tag("rss", rss({ title: "A" }, { datetime: null })),
        ]}
      />,
    )

    expect(screen.getByText("v1.2.3")).toBeTruthy()
    expect(screen.getByText("V")).toBeTruthy()
    expect(screen.getByText("A")).toBeTruthy()
  })

  it("falls back to the no-title label when the payload has no title", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[
          tag("youtube", youtube({ url: "https://www.youtube.com/@a" })),
          tag("rss", rss({ link: "https://example.com/a" })),
        ]}
      />,
    )

    expect(screen.getAllByText("Sans titre")).toHaveLength(2)
  })

  it("keeps a youtube channel url with a trailing slash", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[tag("youtube", youtube({ title: "V", url: "https://youtube.com/" }))]}
      />,
    )
    expect(screen.getByText("V")).toBeTruthy()
  })
})

describe("UnifiedFeedList — lecture et rafraîchissement", () => {
  it("dims an item that has been read", () => {
    renderWithProviders(
      <UnifiedFeedList items={[tag("rss", rss({ title: "A" }))]} readIds={new Set(["rss:3"])} />,
    )
    expect(itemOpacities()).toContain(0.45)
  })

  it("keeps an unread item at full opacity", () => {
    renderWithProviders(<UnifiedFeedList items={[tag("rss", rss({ title: "A" }))]} />)
    expect(itemOpacities()).toContain(1)
  })

  it("keeps the currently open item at full opacity even once read", () => {
    renderWithProviders(
      <UnifiedFeedList
        items={[tag("rss", rss({ title: "A" }))]}
        readIds={new Set(["rss:3"])}
        openItemId="rss:3"
      />,
    )
    expect(itemOpacities()).toContain(1)
    expect(itemOpacities()).not.toContain(0.45)
  })

  it("exposes a pull-to-refresh control", async () => {
    const onRefresh = jest.fn()
    renderWithProviders(
      <UnifiedFeedList items={[tag("rss", rss({ title: "A" }))]} onRefresh={onRefresh} />,
    )

    fireEvent(screen.UNSAFE_getByType(RefreshControl), "refresh")
    await waitFor(() => expect(onRefresh).toHaveBeenCalled())
  })
})
