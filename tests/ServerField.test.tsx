import { screen, fireEvent, waitFor } from "@testing-library/react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ServerField } from "@/components/auth/ServerField"
import { renderWithProviders } from "./render"

const async = AsyncStorage as unknown as {
  getItem: jest.Mock
  setItem: jest.Mock
  removeItem: jest.Mock
}

const DEFAULT = "https://stayup-api.r-sik.workers.dev"

function stage(values: Record<string, string> = {}) {
  const a: Record<string, string> = { ...values }
  async.getItem.mockImplementation((k: string) => Promise.resolve(a[k] ?? null))
  async.setItem.mockImplementation((k: string, v: string) => {
    a[k] = v
    return Promise.resolve()
  })
  async.removeItem.mockImplementation((k: string) => {
    delete a[k]
    return Promise.resolve()
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  stage()
})

describe("ServerField", () => {
  it("prefills with the default API URL", async () => {
    renderWithProviders(<ServerField />)
    await waitFor(() => expect(screen.getByDisplayValue(DEFAULT)).toBeTruthy())
  })

  it("saves a trimmed URL and calls onChanged", async () => {
    const onChanged = jest.fn()
    renderWithProviders(<ServerField onChanged={onChanged} />)
    const input = await screen.findByDisplayValue(DEFAULT)

    fireEvent.changeText(input, "  https://my-api.example.com/  ")
    fireEvent.press(screen.getByText("Enregistrer"))

    await waitFor(() =>
      // the meta list is written under `instances`
      expect(async.setItem).toHaveBeenCalledWith(
        "instances",
        expect.stringContaining("https://my-api.example.com"),
      ),
    )
    expect(onChanged).toHaveBeenCalled()
  })

  it("rejects a malformed URL without writing", async () => {
    renderWithProviders(<ServerField />)
    const input = await screen.findByDisplayValue(DEFAULT)

    fireEvent.changeText(input, "pas-une-url")
    fireEvent.press(screen.getByText("Enregistrer"))

    await waitFor(() => expect(screen.getByText("Saisis une URL valide.")).toBeTruthy())
    expect(async.setItem).not.toHaveBeenCalled()
  })

  it("resets back to the default URL", async () => {
    stage({
      instances: JSON.stringify([{ id: "i1", url: "https://my-api.example.com", name: "x" }]),
    })
    renderWithProviders(<ServerField />)
    await screen.findByDisplayValue("https://my-api.example.com")

    fireEvent.press(screen.getByText("Réinitialiser par défaut"))

    await waitFor(() => expect(screen.getByDisplayValue(DEFAULT)).toBeTruthy())
  })
})
