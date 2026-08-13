import { Alert, Linking } from "react-native"
import { screen, fireEvent, waitFor } from "@testing-library/react-native"
import ArticleScreen from "../app/(app)/feed/article"
import { useFeedReaderStore, type FeedArticle } from "@/store/feedReader"
import { renderWithProviders } from "./render"
import { mockRouter } from "./setup"

let openURL: jest.SpyInstance

function article(overrides: Partial<FeedArticle> = {}): FeedArticle {
  return {
    title: "Mon article",
    provider: "rss",
    date: "1 janvier 2026",
    content: "Le corps de l'article",
    ...overrides,
  }
}

function open(articles: FeedArticle[], index = 0) {
  useFeedReaderStore.setState({ articles, index })
}

/** Déclenche le bouton « Ouvrir » de la dernière Alert.alert. */
function confirmAlert(spy: jest.SpyInstance) {
  const buttons = spy.mock.calls[0][2] as { text: string; onPress?: () => void }[]
  buttons.find((b) => b.text === "Ouvrir")!.onPress!()
}

beforeEach(() => {
  openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true)
  useFeedReaderStore.setState({ articles: [], index: 0 })
})

afterEach(() => openURL.mockRestore())

describe("ArticleScreen — cadre", () => {
  it("renders nothing when there is no article at the index", () => {
    const { toJSON } = renderWithProviders(<ArticleScreen />)
    expect(toJSON()).toBeNull()
  })

  it("shows the title, date and body", () => {
    open([article()])
    renderWithProviders(<ArticleScreen />)

    expect(screen.getAllByText("Mon article")).toHaveLength(2)
    expect(screen.getByText("1 janvier 2026")).toBeTruthy()
    expect(screen.getByText("Le corps de l'article")).toBeTruthy()
  })

  it("goes back", () => {
    open([article()])
    renderWithProviders(<ArticleScreen />)

    fireEvent.press(screen.getByTestId("icon-ChevronLeft"))
    expect(mockRouter.back).toHaveBeenCalled()
  })

  it("shows a placeholder when there is no content", () => {
    open([article({ content: undefined })])
    renderWithProviders(<ArticleScreen />)

    expect(screen.getByText(/Aucun contenu disponible\./)).toBeTruthy()
  })

  it("invites opening the browser when a url is available but no content", () => {
    open([article({ content: undefined, url: "https://example.com/a" })])
    renderWithProviders(<ArticleScreen />)

    expect(screen.getByText(/Ouvre dans le navigateur pour voir l'article complet\./)).toBeTruthy()
  })

  it("shows the YouTube thumbnail", () => {
    open([article({ provider: "youtube", thumbnail: "https://img.example.com/t.jpg" })])
    renderWithProviders(<ArticleScreen />)

    expect(screen.getAllByText("Mon article")).toHaveLength(2)
  })
})

describe("ArticleScreen — ouverture externe", () => {
  it("hides the external link without a url", () => {
    open([article()])
    renderWithProviders(<ArticleScreen />)

    expect(screen.queryByTestId("icon-ExternalLink")).toBeNull()
  })

  it("asks for confirmation before leaving the app", () => {
    const spy = jest.spyOn(Alert, "alert").mockImplementation(() => {})
    open([article({ url: "https://example.com/a" })])
    renderWithProviders(<ArticleScreen />)

    fireEvent.press(screen.getByTestId("icon-ExternalLink"))

    expect(spy).toHaveBeenCalledWith(
      "Ouvrir dans le navigateur",
      "Vous allez quitter l'application pour ouvrir cet article dans votre navigateur.",
      expect.any(Array),
    )
    expect(openURL).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it("opens the url once confirmed", () => {
    const spy = jest.spyOn(Alert, "alert").mockImplementation(() => {})
    open([article({ url: "https://example.com/a" })])
    renderWithProviders(<ArticleScreen />)

    fireEvent.press(screen.getByTestId("icon-ExternalLink"))
    confirmAlert(spy)

    expect(openURL).toHaveBeenCalledWith("https://example.com/a")
    spy.mockRestore()
  })
})

describe("ArticleScreen — navigation entre articles", () => {
  const articles = [
    article({ title: "Premier" }),
    article({ title: "Deuxième" }),
    article({ title: "Troisième" }),
  ]

  it("moves to the next article", async () => {
    open(articles, 0)
    renderWithProviders(<ArticleScreen />)

    fireEvent.press(screen.getByTestId("icon-ChevronDown"))

    await waitFor(() => expect(useFeedReaderStore.getState().index).toBe(1))
  })

  it("moves to the previous article", async () => {
    open(articles, 2)
    renderWithProviders(<ArticleScreen />)

    fireEvent.press(screen.getByTestId("icon-ChevronUp"))

    await waitFor(() => expect(useFeedReaderStore.getState().index).toBe(1))
  })

  it("cannot go back from the first article", () => {
    open(articles, 0)
    renderWithProviders(<ArticleScreen />)

    fireEvent.press(screen.getByTestId("icon-ChevronUp"))

    expect(useFeedReaderStore.getState().index).toBe(0)
  })

  it("cannot go forward from the last article", () => {
    open(articles, 2)
    renderWithProviders(<ArticleScreen />)

    fireEvent.press(screen.getByTestId("icon-ChevronDown"))

    expect(useFeedReaderStore.getState().index).toBe(2)
  })
})
