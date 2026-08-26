import { TextInput } from "react-native"
import { screen, fireEvent, waitFor } from "@testing-library/react-native"
import * as SecureStore from "expo-secure-store"
import { AddFluxSheet } from "@/components/feed/AddFluxSheet"
import {
  addUserRepository,
  createScrapRequest,
  getConnectorProviders,
  getScrapRepos,
  subscribeScrap,
} from "@/lib/api"
import { renderWithProviders } from "./render"

jest.mock("@/lib/api", () => ({
  addUserRepository: jest.fn(),
  createScrapRequest: jest.fn(),
  getScrapRepos: jest.fn(),
  subscribeScrap: jest.fn(),
  getConnectorProviders: jest.fn(),
}))

const secureStore = SecureStore as unknown as { getItemAsync: jest.Mock }
const mockedAdd = addUserRepository as jest.Mock
const mockedCreateRequest = createScrapRequest as jest.Mock
const mockedGetScrapRepos = getScrapRepos as jest.Mock
const mockedSubscribe = subscribeScrap as jest.Mock
const mockedGetConnectorProviders = getConnectorProviders as jest.Mock

const API_URL = "https://stayup-api.r-sik.workers.dev"

// Le dialogue charge la liste des providers au montage (GET /connectors/providers via
// getConnectorProviders) : les tuiles n'apparaissent qu'après cette résolution async.
async function setup(props: Partial<React.ComponentProps<typeof AddFluxSheet>> = {}) {
  const onClose = jest.fn()
  const onSuccess = jest.fn()

  renderWithProviders(
    <AddFluxSheet visible onClose={onClose} userId="user-1" onSuccess={onSuccess} {...props} />,
  )
  await waitFor(() => expect(screen.getByText("GitHub")).toBeTruthy())

  return { onClose, onSuccess }
}

function firstInput() {
  return screen.UNSAFE_getAllByType(TextInput)[0]
}

beforeEach(() => {
  secureStore.getItemAsync.mockResolvedValue("tok")
  mockedGetScrapRepos.mockResolvedValue([])
  mockedAdd.mockResolvedValue(undefined)
  mockedGetConnectorProviders.mockResolvedValue([
    { name: "changelog", displayName: "Changelog" },
    { name: "youtube", displayName: "YouTube" },
    { name: "rss", displayName: "RSS" },
    { name: "scrap", displayName: "Scrap" },
  ])
})

describe("AddFluxSheet — providers", () => {
  it("lists the four feed providers and no longer offers Documentation", async () => {
    await setup()

    await waitFor(() => expect(screen.getByText("GitHub")).toBeTruthy())
    expect(screen.getByText("YouTube")).toBeTruthy()
    expect(screen.getByText("RSS")).toBeTruthy()
    expect(screen.getByText("Web")).toBeTruthy()
    expect(screen.queryByText("Documentation")).toBeNull()
  })

  it("shows the identifier label of the selected provider", async () => {
    await setup()
    await waitFor(() => expect(screen.getByText("Dépôt GitHub")).toBeTruthy())

    fireEvent.press(screen.getByText("YouTube"))
    await waitFor(() => expect(screen.getByText("Chaîne YouTube")).toBeTruthy())

    fireEvent.press(screen.getByText("RSS"))
    await waitFor(() => expect(screen.getByText("URL du flux RSS")).toBeTruthy())
  })
})

describe("AddFluxSheet — ajout par identifiant", () => {
  it("normalizes the identifier and posts the repository", async () => {
    const { onSuccess, onClose } = await setup()
    await waitFor(() => expect(screen.getByText("Dépôt GitHub")).toBeTruthy())

    fireEvent.changeText(firstInput(), "https://github.com/facebook/react.git")
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() =>
      expect(mockedAdd).toHaveBeenCalledWith("user-1", "tok", API_URL, {
        provider: "changelog",
        url: "https://github.com/facebook/react/",
        config: { max_scraps: 5, retention_days: 15 },
      }),
    )
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it("builds a YouTube url from a bare handle", async () => {
    await setup()
    await waitFor(() => expect(screen.getByText("YouTube")).toBeTruthy())
    fireEvent.press(screen.getByText("YouTube"))

    fireEvent.changeText(firstInput(), "@fireship")
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() =>
      expect(mockedAdd).toHaveBeenCalledWith(
        "user-1",
        "tok",
        API_URL,
        expect.objectContaining({ provider: "youtube", url: "https://www.youtube.com/@fireship" }),
      ),
    )
  })

  it("rejects an empty identifier", async () => {
    await setup()
    await waitFor(() => expect(screen.getByText("Ajouter")).toBeTruthy())

    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(screen.getByText("Ce champ est requis")).toBeTruthy())
    expect(mockedAdd).not.toHaveBeenCalled()
  })

  it("reports a missing token", async () => {
    secureStore.getItemAsync.mockResolvedValue(null)
    await setup()
    await waitFor(() => expect(screen.getByText("Ajouter")).toBeTruthy())

    fireEvent.changeText(firstInput(), "facebook/react")
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(screen.getByText("Token manquant")).toBeTruthy())
  })

  it("surfaces the API error", async () => {
    mockedAdd.mockRejectedValue(new Error("StayUp API error 500"))
    await setup()
    await waitFor(() => expect(screen.getByText("Ajouter")).toBeTruthy())

    fireEvent.changeText(firstInput(), "facebook/react")
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(screen.getByText("StayUp API error 500")).toBeTruthy())
  })

  it("falls back to the generic error for a non-Error rejection", async () => {
    mockedAdd.mockRejectedValue("boom")
    await setup()
    await waitFor(() => expect(screen.getByText("Ajouter")).toBeTruthy())

    fireEvent.changeText(firstInput(), "facebook/react")
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(screen.getByText("Une erreur est survenue.")).toBeTruthy())
  })
})

describe("AddFluxSheet — abonnement scraping", () => {
  const repos = [
    {
      id: 1,
      url: "https://a.example.com",
      config: {},
      created_at: "2026-01-01",
      is_subscribed: false,
    },
    {
      id: 2,
      url: "https://b.example.com",
      config: {},
      created_at: "2026-01-01",
      is_subscribed: true,
    },
  ]

  it("lists only the repos that are not already subscribed", async () => {
    mockedGetScrapRepos.mockResolvedValue(repos)
    await setup()
    fireEvent.press(screen.getByText("Web"))

    await waitFor(() => expect(screen.getByText("https://a.example.com")).toBeTruthy())
    expect(screen.queryByText("https://b.example.com")).toBeNull()
  })

  it("shows the empty state when nothing is available", async () => {
    mockedGetScrapRepos.mockResolvedValue([])
    await setup()
    fireEvent.press(screen.getByText("Web"))

    await waitFor(() => expect(screen.getByText("Aucun flux disponible")).toBeTruthy())
  })

  it("falls back to an empty list when the fetch fails", async () => {
    mockedGetScrapRepos.mockRejectedValue(new Error("500"))
    await setup()
    fireEvent.press(screen.getByText("Web"))

    await waitFor(() => expect(screen.getByText("Aucun flux disponible")).toBeTruthy())
  })

  it("falls back to an empty list when there is no token", async () => {
    secureStore.getItemAsync.mockResolvedValue(null)
    await setup()
    fireEvent.press(screen.getByText("Web"))

    await waitFor(() => expect(screen.getByText("Aucun flux disponible")).toBeTruthy())
    expect(mockedGetScrapRepos).not.toHaveBeenCalled()
  })

  it("requires a selection before subscribing", async () => {
    mockedGetScrapRepos.mockResolvedValue(repos)
    await setup()
    fireEvent.press(screen.getByText("Web"))
    await waitFor(() => expect(screen.getByText("https://a.example.com")).toBeTruthy())

    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(screen.getByText("Sélectionnez un flux")).toBeTruthy())
    expect(mockedSubscribe).not.toHaveBeenCalled()
  })

  it("subscribes to the selected repo", async () => {
    mockedGetScrapRepos.mockResolvedValue(repos)
    mockedSubscribe.mockResolvedValue(undefined)
    const { onSuccess } = await setup()
    fireEvent.press(screen.getByText("Web"))
    await waitFor(() => expect(screen.getByText("https://a.example.com")).toBeTruthy())

    fireEvent.press(screen.getByText("https://a.example.com"))
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(mockedSubscribe).toHaveBeenCalledWith(1, "tok", API_URL))
    expect(onSuccess).toHaveBeenCalled()
  })
})

describe("AddFluxSheet — demande de scraping", () => {
  function openRequestMode() {
    fireEvent.press(screen.getByText("Web"))
    fireEvent.press(screen.getByText("Faire une demande"))
  }

  it("requires a url", async () => {
    await setup()
    openRequestMode()
    await waitFor(() => expect(screen.getByText("URL de la page à scraper")).toBeTruthy())

    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(screen.getByText("Ce champ est requis")).toBeTruthy())
    expect(mockedCreateRequest).not.toHaveBeenCalled()
  })

  it("rejects a malformed url", async () => {
    await setup()
    openRequestMode()
    await waitFor(() => expect(screen.getByText("URL de la page à scraper")).toBeTruthy())

    fireEvent.changeText(firstInput(), "pas-une-url")
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(screen.getByText("L'URL n'est pas valide")).toBeTruthy())
    expect(mockedCreateRequest).not.toHaveBeenCalled()
  })

  it("confirms once the request is sent", async () => {
    mockedCreateRequest.mockResolvedValue({ id: "req-1" })
    await setup()
    openRequestMode()
    await waitFor(() => expect(screen.getByText("URL de la page à scraper")).toBeTruthy())

    fireEvent.changeText(firstInput(), "https://example.com/blog")
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(screen.getByText("Demande envoyée !")).toBeTruthy())
    expect(mockedCreateRequest).toHaveBeenCalledWith(
      { url: "https://example.com/blog" },
      "tok",
      API_URL,
    )
  })

  it("surfaces a request failure", async () => {
    mockedCreateRequest.mockRejectedValue(new Error("quota dépassé"))
    await setup()
    openRequestMode()
    await waitFor(() => expect(screen.getByText("URL de la page à scraper")).toBeTruthy())

    fireEvent.changeText(firstInput(), "https://example.com/blog")
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(screen.getByText("quota dépassé")).toBeTruthy())
  })

  it("reports a missing token", async () => {
    secureStore.getItemAsync.mockResolvedValue(null)
    await setup()
    openRequestMode()
    await waitFor(() => expect(screen.getByText("URL de la page à scraper")).toBeTruthy())

    fireEvent.changeText(firstInput(), "https://example.com/blog")
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(screen.getByText("Token manquant")).toBeTruthy())
  })

  it("falls back to the generic error for a non-Error rejection", async () => {
    mockedCreateRequest.mockRejectedValue("boom")
    await setup()
    openRequestMode()
    await waitFor(() => expect(screen.getByText("URL de la page à scraper")).toBeTruthy())

    fireEvent.changeText(firstInput(), "https://example.com/blog")
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() => expect(screen.getByText("Une erreur est survenue.")).toBeTruthy())
  })

  it("switches back to the selection mode", async () => {
    await setup()
    openRequestMode()
    await waitFor(() => expect(screen.getByText("URL de la page à scraper")).toBeTruthy())

    fireEvent.press(screen.getByText("Choisir un flux existant"))

    await waitFor(() => expect(screen.getByText("Flux disponible")).toBeTruthy())
  })
})

describe("AddFluxSheet — provider inconnu de l'app", () => {
  it("renders a generic tile and posts a plain URL identifier", async () => {
    mockedGetConnectorProviders.mockResolvedValue([
      { name: "changelog", displayName: "Changelog" },
      { name: "youtube", displayName: "YouTube" },
      { name: "rss", displayName: "RSS" },
      { name: "scrap", displayName: "Scrap" },
      { name: "podcast", displayName: "Podcast" },
    ])
    const { onSuccess } = await setup()

    fireEvent.press(screen.getByText("Podcast"))
    await waitFor(() => expect(screen.getByText("URL")).toBeTruthy())

    fireEvent.changeText(firstInput(), "https://example.com/feed.xml")
    fireEvent.press(screen.getByText("Ajouter"))

    await waitFor(() =>
      expect(mockedAdd).toHaveBeenCalledWith("user-1", "tok", API_URL, {
        provider: "podcast",
        url: "https://example.com/feed.xml",
        config: { max_scraps: 5, retention_days: 15 },
      }),
    )
    expect(onSuccess).toHaveBeenCalled()
  })
})

describe("AddFluxSheet — fermeture", () => {
  it("closes from the cross", async () => {
    const { onClose } = await setup()
    await waitFor(() => expect(screen.getByTestId("icon-X")).toBeTruthy())

    fireEvent.press(screen.getByTestId("icon-X"))
    expect(onClose).toHaveBeenCalled()
  })

  it("does not close when the sheet body itself is tapped", async () => {
    const { onClose } = await setup()
    await waitFor(() => expect(screen.getByText("Ajouter un flux")).toBeTruthy())

    const stopPropagation = jest.fn()
    fireEvent.press(screen.getByText("Ajouter un flux"), { stopPropagation })

    expect(stopPropagation).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("closes from the cancel button", async () => {
    const { onClose } = await setup()
    await waitFor(() => expect(screen.getByText("Annuler")).toBeTruthy())

    fireEvent.press(screen.getByText("Annuler"))
    expect(onClose).toHaveBeenCalled()
  })

  it("resets the form between openings", async () => {
    const { onClose } = await setup()
    await waitFor(() => expect(screen.getByText("Dépôt GitHub")).toBeTruthy())

    fireEvent.press(screen.getByText("YouTube"))
    await waitFor(() => expect(screen.getByText("Chaîne YouTube")).toBeTruthy())

    fireEvent.press(screen.getByText("Annuler"))

    expect(onClose).toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText("Dépôt GitHub")).toBeTruthy())
  })

  it("closes from the confirmation screen", async () => {
    mockedCreateRequest.mockResolvedValue({ id: "req-1" })
    const { onClose } = await setup()
    fireEvent.press(screen.getByText("Web"))
    fireEvent.press(screen.getByText("Faire une demande"))
    await waitFor(() => expect(screen.getByText("URL de la page à scraper")).toBeTruthy())

    fireEvent.changeText(firstInput(), "https://example.com/blog")
    fireEvent.press(screen.getByText("Ajouter"))
    await waitFor(() => expect(screen.getByText("Demande envoyée !")).toBeTruthy())

    fireEvent.press(screen.getByText("Annuler"))
    expect(onClose).toHaveBeenCalled()
  })
})
