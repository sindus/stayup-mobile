import { Alert } from "react-native"
import { screen, fireEvent, waitFor } from "@testing-library/react-native"
import * as SecureStore from "expo-secure-store"
import { FeedFluxList } from "@/components/feed/FeedFluxList"
import { deleteUserRepository } from "@/lib/api"
import type { FeedFlux } from "@/hooks/useFeed"
import { renderWithProviders } from "./render"
import { TEMPLATES } from "./_templates"

jest.mock("@/lib/api", () => ({ deleteUserRepository: jest.fn() }))

const secureStore = SecureStore as unknown as { getItemAsync: jest.Mock }
const mockedDelete = deleteUserRepository as jest.Mock

const TOKEN = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: "user-1" }))
  .toString("base64")
  .replace(/=/g, "")}.sig`
const INSTANCES = [
  { id: "i1", url: "https://stayup-api.r-sik.workers.dev", name: "Primary", token: TOKEN },
]

const fluxes: FeedFlux[] = [
  {
    id: "link-1",
    repository_id: 10,
    provider: "changelog",
    url: "https://github.com/facebook/react/",
    identifier: "facebook/react",
    instanceId: "i1",
    instanceName: "Primary",
  },
  {
    id: "link-2",
    repository_id: 11,
    provider: "youtube",
    url: "https://www.youtube.com/@fireship",
    identifier: "@fireship",
    instanceId: "i1",
    instanceName: "Primary",
  },
]

function setup(props: Partial<React.ComponentProps<typeof FeedFluxList>> = {}) {
  const onSelectProvider = jest.fn()
  const onAddPress = jest.fn()
  const onDeleted = jest.fn()
  const onImported = jest.fn()

  renderWithProviders(
    <FeedFluxList
      fluxes={fluxes}
      templates={TEMPLATES}
      instances={INSTANCES}
      selectedProvider={null}
      onSelectProvider={onSelectProvider}
      onAddPress={onAddPress}
      onDeleted={onDeleted}
      onImported={onImported}
      {...props}
    />,
  )

  return { onSelectProvider, onAddPress, onDeleted, onImported }
}

beforeEach(() => {
  secureStore.getItemAsync.mockResolvedValue("tok")
})

describe("FeedFluxList", () => {
  it("shows a chip only for providers that have fluxes", async () => {
    setup()

    await waitFor(() => expect(screen.getByText("Mes flux")).toBeTruthy())
    expect(screen.getByText("Tous les flux")).toBeTruthy()
    expect(screen.getByText("Changelog")).toBeTruthy()
    expect(screen.getByText("YouTube")).toBeTruthy()
    expect(screen.queryByText("RSS")).toBeNull()
    expect(screen.queryByText("Scraping web")).toBeNull()
  })

  it("selects a provider", async () => {
    const { onSelectProvider } = setup()
    await waitFor(() => expect(screen.getByText("YouTube")).toBeTruthy())

    fireEvent.press(screen.getByText("YouTube"))
    expect(onSelectProvider).toHaveBeenCalledWith("youtube")
  })

  it("deselects the provider that is already active", async () => {
    const { onSelectProvider } = setup({ selectedProvider: "youtube" })
    await waitFor(() => expect(screen.getByText("YouTube")).toBeTruthy())

    fireEvent.press(screen.getByText("YouTube"))
    expect(onSelectProvider).toHaveBeenCalledWith(null)
  })

  it("resets the filter from the all-feeds chip", async () => {
    const { onSelectProvider } = setup({ selectedProvider: "youtube" })
    await waitFor(() => expect(screen.getByText("Tous les flux")).toBeTruthy())

    fireEvent.press(screen.getByText("Tous les flux"))
    expect(onSelectProvider).toHaveBeenCalledWith(null)
  })

  it("asks to add a flux", async () => {
    const { onAddPress } = setup()
    await waitFor(() => expect(screen.getByTestId("icon-Plus")).toBeTruthy())

    // Le bouton + arrête la propagation pour ne pas replier la section.
    const stopPropagation = jest.fn()
    fireEvent.press(screen.getByTestId("icon-Plus"), { stopPropagation })

    expect(stopPropagation).toHaveBeenCalled()
    expect(onAddPress).toHaveBeenCalled()
  })

  it("sums the unread counts per provider", async () => {
    setup({ unreadCountByRepoId: { "i1:10": 3, "i1:11": 2 } })

    await waitFor(() => expect(screen.getByText("3")).toBeTruthy())
    expect(screen.getByText("2")).toBeTruthy()
  })

  it("lists the individual fluxes of the selected provider", async () => {
    setup({ selectedProvider: "changelog" })

    await waitFor(() => expect(screen.getByText("facebook/react")).toBeTruthy())
    expect(screen.getByTestId("icon-Trash2")).toBeTruthy()
  })

  it("shows the per-flux unread badge", async () => {
    setup({ selectedProvider: "changelog", unreadCountByRepoId: { "i1:10": 7 } })

    // Le badge du provider et celui du flux affichent tous les deux 7.
    await waitFor(() => expect(screen.getAllByText("7")).toHaveLength(2))
  })

  it("collapses and re-expands the section", async () => {
    setup({ selectedProvider: "youtube" })
    await waitFor(() => expect(screen.getByText("Tous les flux")).toBeTruthy())

    fireEvent.press(screen.getByText("Mes flux"))

    // Replié : les chips disparaissent, le badge du filtre actif apparaît.
    await waitFor(() => expect(screen.queryByText("Tous les flux")).toBeNull())
    expect(screen.getByText("YouTube")).toBeTruthy()
    expect(screen.getByTestId("icon-ChevronDown")).toBeTruthy()

    fireEvent.press(screen.getByText("Mes flux"))
    await waitFor(() => expect(screen.getByText("Tous les flux")).toBeTruthy())
    expect(screen.getByTestId("icon-ChevronUp")).toBeTruthy()
  })

  it("hides the active-filter badge when collapsed with no filter", async () => {
    setup()
    await waitFor(() => expect(screen.getByText("Tous les flux")).toBeTruthy())

    fireEvent.press(screen.getByText("Mes flux"))

    await waitFor(() => expect(screen.queryByText("Tous les flux")).toBeNull())
    expect(screen.queryByText("YouTube")).toBeNull()
  })
})

describe("FeedFluxList — multi-instance", () => {
  it("badges each flux with its instance name once several are connected", () => {
    setup({
      selectedProvider: "changelog",
      fluxes: [
        { ...fluxes[0], instanceId: "i1", instanceName: "Alpha" },
        { ...fluxes[0], id: "l2", instanceId: "i2", instanceName: "Beta" },
      ],
    })
    expect(screen.getByText("Alpha")).toBeTruthy()
    expect(screen.getByText("Beta")).toBeTruthy()
  })

  it("shows no instance badge with a single instance", () => {
    setup({ selectedProvider: "changelog" })
    expect(screen.queryByText("Primary")).toBeNull()
  })

  it("tolerates an empty instance list", () => {
    setup({ instances: [] })
    expect(screen.getByText("Tous les flux")).toBeTruthy()
  })
})

describe("FeedFluxList — suppression", () => {
  function pressDelete() {
    fireEvent.press(screen.getByTestId("icon-Trash2"))
  }

  /** Déclenche l'action destructive de la dernière Alert.alert. */
  async function confirmAlert(spy: jest.SpyInstance) {
    const buttons = spy.mock.calls[0][2] as { text: string; onPress?: () => void }[]
    await buttons.find((b) => b.text === "Supprimer")!.onPress!()
  }

  it("asks for confirmation before deleting", async () => {
    const spy = jest.spyOn(Alert, "alert").mockImplementation(() => {})
    setup({ selectedProvider: "changelog" })
    await waitFor(() => expect(screen.getByTestId("icon-Trash2")).toBeTruthy())

    pressDelete()

    expect(spy).toHaveBeenCalledWith(
      "Voulez-vous vraiment supprimer ?",
      "facebook/react",
      expect.any(Array),
    )
    expect(mockedDelete).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it("deletes the flux once confirmed", async () => {
    const spy = jest.spyOn(Alert, "alert").mockImplementation(() => {})
    mockedDelete.mockResolvedValue(undefined)
    const { onDeleted } = setup({ selectedProvider: "changelog" })
    await waitFor(() => expect(screen.getByTestId("icon-Trash2")).toBeTruthy())

    pressDelete()
    await confirmAlert(spy)

    expect(mockedDelete).toHaveBeenCalledWith(
      "user-1",
      "link-1",
      TOKEN,
      "https://stayup-api.r-sik.workers.dev",
    )
    expect(onDeleted).toHaveBeenCalled()
    spy.mockRestore()
  })

  it("does nothing when the flux's instance is unknown", async () => {
    const spy = jest.spyOn(Alert, "alert").mockImplementation(() => {})
    const { onDeleted } = setup({
      selectedProvider: "changelog",
      fluxes: [{ ...fluxes[0], instanceId: "gone" }],
    })
    await waitFor(() => expect(screen.getByTestId("icon-Trash2")).toBeTruthy())

    pressDelete()
    await confirmAlert(spy)

    expect(mockedDelete).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it("swallows a deletion failure", async () => {
    const spy = jest.spyOn(Alert, "alert").mockImplementation(() => {})
    mockedDelete.mockRejectedValue(new Error("500"))
    const { onDeleted } = setup({ selectedProvider: "changelog" })
    await waitFor(() => expect(screen.getByTestId("icon-Trash2")).toBeTruthy())

    pressDelete()
    await confirmAlert(spy)

    expect(onDeleted).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
