import { Linking } from "react-native"
import { screen, fireEvent, waitFor } from "@testing-library/react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import FeedDetailScreen from "../app/(app)/feed/detail"
import { useSelectedFeedItemStore } from "@/store/selectedFeedItem"
import { useReadItemsStore } from "@/store/readItems"
import type { TaggedItem } from "@/types"
import { renderWithProviders } from "./render"
import { mockRouter } from "./setup"

const asyncStorage = AsyncStorage as unknown as { getItem: jest.Mock; setItem: jest.Mock }
const FONT_KEY = "STAYUP_FONT_SIZE_OFFSET"

let openURL: jest.SpyInstance

function stubStorage(values: Record<string, string> = {}) {
  asyncStorage.getItem.mockImplementation((key: string) => Promise.resolve(values[key] ?? null))
}

function select(item: TaggedItem, repoUrl = "") {
  useSelectedFeedItemStore.setState({ item, repoUrl })
}

const changelogItem: TaggedItem = {
  provider: "changelog",
  item: {
    id: 1,
    repository_id: 10,
    content: "## Titre\n**gras** et `code`",
    diff: null,
    datetime: "2026-03-01T10:00:00Z",
    executed_at: "2026-03-01T11:00:00Z",
    success: true,
    version: "v1.2.3",
  },
}

function youtubeItem(content: unknown): TaggedItem {
  return {
    provider: "youtube",
    item: {
      id: 2,
      repository_id: 11,
      version: "1",
      content: typeof content === "string" ? content : JSON.stringify(content),
      diff: null,
      datetime: "2026-02-01T10:00:00Z",
      executed_at: "2026-02-01T11:00:00Z",
      success: true,
    },
  }
}

function rssTagged(content: unknown): TaggedItem {
  return {
    provider: "rss",
    item: {
      id: 3,
      repository_id: 12,
      content: typeof content === "string" ? content : JSON.stringify(content),
      datetime: "2026-01-01T10:00:00Z",
      executed_at: "2026-01-01T11:00:00Z",
      success: true,
    },
  }
}

function scrapTagged(params: unknown, content = "Contenu scrapé"): TaggedItem {
  return {
    provider: "scrap",
    item: {
      id: 4,
      repository_id: 13,
      content,
      params: params as never,
      executed_at: "2025-12-01T11:00:00Z",
      success: true,
    },
  }
}

function genericTagged(
  overrides: Partial<{ content: string; version: string | null; datetime: string | null }> = {},
): TaggedItem {
  return {
    provider: "podcast",
    item: {
      id: 5,
      repository_id: 14,
      content: "Corps générique",
      version: "s02e04",
      datetime: "2026-04-01T10:00:00Z",
      executed_at: "2026-04-01T11:00:00Z",
      ...overrides,
    },
  }
}

beforeEach(() => {
  stubStorage()
  openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true)
  useSelectedFeedItemStore.setState({ item: null, repoUrl: "" })
  useReadItemsStore.setState({ readIds: new Set(), initialized: true })
})

afterEach(() => openURL.mockRestore())

describe("FeedDetailScreen — cadre", () => {
  it("renders nothing without a selected item", () => {
    const { toJSON } = renderWithProviders(<FeedDetailScreen />)
    expect(toJSON()).toBeNull()
  })

  it("marks the opened item as read", async () => {
    select(rssTagged({ title: "A" }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() =>
      expect(asyncStorage.setItem).toHaveBeenCalledWith("read_items", JSON.stringify(["rss:3"])),
    )
  })

  it("goes back", async () => {
    select(rssTagged({ title: "A" }))
    renderWithProviders(<FeedDetailScreen />)
    await waitFor(() => expect(screen.getByTestId("icon-ChevronLeft")).toBeTruthy())

    fireEvent.press(screen.getByTestId("icon-ChevronLeft"))
    expect(mockRouter.back).toHaveBeenCalled()
  })
})

describe("FeedDetailScreen — taille de police", () => {
  it("restores the stored offset", async () => {
    stubStorage({ [FONT_KEY]: "4" })
    select(rssTagged({ title: "A", summary: "Corps" }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getByText("Corps").props.style.fontSize).toBe(20))
  })

  it("ignores a malformed stored offset", async () => {
    stubStorage({ [FONT_KEY]: "abc" })
    select(rssTagged({ title: "A", summary: "Corps" }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getByText("Corps").props.style.fontSize).toBe(16))
  })

  it("increases and persists the font size", async () => {
    select(rssTagged({ title: "A", summary: "Corps" }))
    renderWithProviders(<FeedDetailScreen />)
    await waitFor(() => expect(screen.getByText("A+")).toBeTruthy())

    fireEvent.press(screen.getByText("A+"))

    await waitFor(() => expect(asyncStorage.setItem).toHaveBeenCalledWith(FONT_KEY, "1"))
    expect(screen.getByText("Corps").props.style.fontSize).toBe(17)
  })

  it("decreases and persists the font size", async () => {
    select(rssTagged({ title: "A", summary: "Corps" }))
    renderWithProviders(<FeedDetailScreen />)
    await waitFor(() => expect(screen.getByText("A−")).toBeTruthy())

    fireEvent.press(screen.getByText("A−"))

    await waitFor(() => expect(asyncStorage.setItem).toHaveBeenCalledWith(FONT_KEY, "-1"))
  })

  it("clamps at the minimum offset", async () => {
    stubStorage({ [FONT_KEY]: "-4" })
    select(rssTagged({ title: "A", summary: "Corps" }))
    renderWithProviders(<FeedDetailScreen />)
    await waitFor(() => expect(screen.getByText("Corps").props.style.fontSize).toBe(12))

    // Le bouton est désactivé à la borne : l'appui ne change rien.
    fireEvent.press(screen.getByText("A−"))

    expect(asyncStorage.setItem).not.toHaveBeenCalledWith(FONT_KEY, expect.anything())
    expect(screen.getByText("Corps").props.style.fontSize).toBe(12)
  })

  it("clamps at the maximum offset", async () => {
    stubStorage({ [FONT_KEY]: "10" })
    select(rssTagged({ title: "A", summary: "Corps" }))
    renderWithProviders(<FeedDetailScreen />)
    await waitFor(() => expect(screen.getByText("Corps").props.style.fontSize).toBe(26))

    // Le bouton est désactivé à la borne : l'appui ne change rien.
    fireEvent.press(screen.getByText("A+"))

    expect(asyncStorage.setItem).not.toHaveBeenCalledWith(FONT_KEY, expect.anything())
    expect(screen.getByText("Corps").props.style.fontSize).toBe(26)
  })
})

describe("FeedDetailScreen — changelog", () => {
  it("shows the repo, version and cleaned markdown", async () => {
    select(changelogItem, "https://github.com/facebook/react")
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getByText("facebook/react")).toBeTruthy())
    expect(screen.getAllByText("v1.2.3").length).toBeGreaterThan(0)
    expect(screen.getByText("Titre\ngras et code")).toBeTruthy()
  })

  it("falls back to the repository label without a url", async () => {
    select(changelogItem)
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getByText("dépôt")).toBeTruthy())
    expect(screen.queryByText("Voir sur GitHub")).toBeNull()
  })

  it("opens the release page", async () => {
    select(changelogItem, "https://github.com/facebook/react")
    renderWithProviders(<FeedDetailScreen />)
    await waitFor(() => expect(screen.getByText("Voir sur GitHub")).toBeTruthy())

    fireEvent.press(screen.getByText("Voir sur GitHub"))
    expect(openURL).toHaveBeenCalledWith("https://github.com/facebook/react/releases/tag/v1.2.3")
  })

  it("hides the body when the changelog is empty", async () => {
    select({ ...changelogItem, item: { ...changelogItem.item, content: "" } } as TaggedItem)
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("v1.2.3").length).toBeGreaterThan(0))
  })
})

describe("FeedDetailScreen — youtube", () => {
  it("shows the title, channel and thumbnail", async () => {
    select(
      youtubeItem({
        title: "Ma vidéo",
        url: "https://www.youtube.com/@fireship",
        thumbnail: "https://img.example.com/t.jpg",
      }),
    )
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("Ma vidéo").length).toBeGreaterThan(0))
    expect(screen.getByText("@fireship")).toBeTruthy()
    expect(screen.getByText("Voir sur YouTube")).toBeTruthy()
  })

  it("derives the channel from the last path segment", async () => {
    select(youtubeItem({ title: "V", url: "https://www.youtube.com/channel/UC123" }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getByText("UC123")).toBeTruthy())
  })

  it("keeps a malformed channel url as-is", async () => {
    select(youtubeItem({ title: "V", url: "pas-une-url" }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getByText("pas-une-url")).toBeTruthy())
  })

  it("falls back to the no-title label on malformed content", async () => {
    select(youtubeItem("{cassé"))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("Sans titre").length).toBeGreaterThan(0))
    expect(screen.queryByText("Voir sur YouTube")).toBeNull()
  })

  it("opens the video", async () => {
    select(youtubeItem({ title: "V", link: "https://youtu.be/xyz" }))
    renderWithProviders(<FeedDetailScreen />)
    await waitFor(() => expect(screen.getByText("Voir sur YouTube")).toBeTruthy())

    fireEvent.press(screen.getByText("Voir sur YouTube"))
    expect(openURL).toHaveBeenCalledWith("https://youtu.be/xyz")
  })
})

describe("FeedDetailScreen — rss", () => {
  it("shows the title, source and html-stripped summary", async () => {
    select(
      rssTagged({
        title: "Mon article",
        link: "https://www.blog.example.com/a",
        summary: "<p>Un &amp; résumé</p>",
      }),
    )
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("Mon article").length).toBeGreaterThan(0))
    expect(screen.getByText("blog.example.com")).toBeTruthy()
    expect(screen.getByText("Un & résumé")).toBeTruthy()
    expect(screen.getByText("Lire l'article")).toBeTruthy()
  })

  it("keeps a malformed link as the source", async () => {
    select(rssTagged({ title: "A", link: "pas-une-url" }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getByText("pas-une-url")).toBeTruthy())
  })

  it("falls back to the no-title label on malformed content", async () => {
    select(rssTagged("{cassé"))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("Sans titre").length).toBeGreaterThan(0))
    expect(screen.queryByText("Lire l'article")).toBeNull()
  })

  it("opens the article", async () => {
    select(rssTagged({ title: "A", link: "https://example.com/a" }))
    renderWithProviders(<FeedDetailScreen />)
    await waitFor(() => expect(screen.getByText("Lire l'article")).toBeTruthy())

    fireEvent.press(screen.getByText("Lire l'article"))
    expect(openURL).toHaveBeenCalledWith("https://example.com/a")
  })
})

describe("FeedDetailScreen — dates et titres de repli", () => {
  it("falls back to executed_at when datetime is null", async () => {
    select({
      ...changelogItem,
      item: { ...changelogItem.item, datetime: null },
    } as TaggedItem)
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("v1.2.3").length).toBeGreaterThan(0))
  })

  it("falls back to the no-title label when the youtube payload has no title", async () => {
    select(youtubeItem({ url: "https://www.youtube.com/@a" }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("Sans titre").length).toBeGreaterThan(0))
  })

  it("falls back to the no-title label when the rss payload has no title", async () => {
    select(rssTagged({ link: "https://example.com/a" }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("Sans titre").length).toBeGreaterThan(0))
  })

  it("keeps a youtube channel url with a trailing slash", async () => {
    select(youtubeItem({ title: "V", url: "https://youtube.com/" }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("V").length).toBeGreaterThan(0))
  })

  it("falls back to executed_at for a youtube item without datetime", async () => {
    select({
      provider: "youtube",
      item: {
        id: 2,
        repository_id: 11,
        version: "1",
        content: JSON.stringify({ title: "V", url: "https://www.youtube.com/@a" }),
        diff: null,
        datetime: null,
        executed_at: "2026-02-01T11:00:00Z",
        success: true,
      },
    })
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("V").length).toBeGreaterThan(0))
  })

  it("falls back to executed_at for an rss item without datetime", async () => {
    select({
      provider: "rss",
      item: {
        id: 3,
        repository_id: 12,
        content: JSON.stringify({ title: "A" }),
        datetime: null,
        executed_at: "2026-01-01T11:00:00Z",
        success: true,
      },
    })
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("A").length).toBeGreaterThan(0))
  })
})

describe("FeedDetailScreen — scraping", () => {
  it("shows the scrap label, url and content", async () => {
    select(scrapTagged({ url: "https://example.com/blog" }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getByText("Scrap")).toBeTruthy())
    expect(screen.getByText("https://example.com/blog")).toBeTruthy()
    expect(screen.getByText("Contenu scrapé")).toBeTruthy()
    expect(screen.getByText("Visiter le site")).toBeTruthy()
  })

  it("parses params given as a JSON string", async () => {
    select(scrapTagged(JSON.stringify({ url: "https://example.com/x" })))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getByText("https://example.com/x")).toBeTruthy())
  })

  it("tolerates malformed params", async () => {
    select(scrapTagged("{cassé"))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getByText("Contenu scrapé")).toBeTruthy())
    expect(screen.queryByText("Visiter le site")).toBeNull()
  })

  it("hides the body when the content is empty", async () => {
    select(scrapTagged({ url: "https://example.com/x" }, ""))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getByText("https://example.com/x")).toBeTruthy())
    expect(screen.queryByText("Contenu scrapé")).toBeNull()
  })

  it("opens the scraped site", async () => {
    select(scrapTagged({ url: "https://example.com/blog" }))
    renderWithProviders(<FeedDetailScreen />)
    await waitFor(() => expect(screen.getByText("Visiter le site")).toBeTruthy())

    fireEvent.press(screen.getByText("Visiter le site"))
    expect(openURL).toHaveBeenCalledWith("https://example.com/blog")
  })
})

describe("FeedDetailScreen — provider inconnu", () => {
  it("renders the generic detail with the capitalized provider label", async () => {
    select(genericTagged())
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("Podcast")).toHaveLength(2))
    expect(screen.getByText("s02e04")).toBeTruthy()
    expect(screen.getByText("Corps générique")).toBeTruthy()
  })

  it("omits the version and the body when the item carries neither", async () => {
    select(genericTagged({ content: "", version: null }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("Podcast")).toHaveLength(2))
    expect(screen.queryByText("s02e04")).toBeNull()
    expect(screen.queryByText("Corps générique")).toBeNull()
  })

  it("falls back to executed_at when the item has no datetime", async () => {
    select(genericTagged({ datetime: null }))
    renderWithProviders(<FeedDetailScreen />)

    await waitFor(() => expect(screen.getAllByText("Podcast")).toHaveLength(2))
  })
})
