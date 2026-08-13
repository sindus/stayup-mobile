import { Text, Pressable } from "react-native"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LanguageProvider, useLanguage } from "@/context/LanguageContext"

const asyncStorage = AsyncStorage as unknown as { getItem: jest.Mock; setItem: jest.Mock }

function Probe() {
  const { lang, t, setLang } = useLanguage()
  return (
    <>
      <Text testID="lang">{lang}</Text>
      <Text testID="label">{t.auth.signIn}</Text>
      <Pressable testID="to-en" onPress={() => setLang("en")}>
        <Text>switch</Text>
      </Pressable>
    </>
  )
}

function renderProbe() {
  return render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  )
}

beforeEach(() => {
  asyncStorage.getItem.mockResolvedValue(null)
})

describe("LanguageProvider", () => {
  it("defaults to French when nothing is stored", async () => {
    renderProbe()

    await waitFor(() => expect(screen.getByTestId("lang")).toHaveTextContent("fr"))
    expect(screen.getByTestId("label")).toHaveTextContent("Se connecter")
  })

  it("restores the stored language", async () => {
    asyncStorage.getItem.mockResolvedValue("en")
    renderProbe()

    await waitFor(() => expect(screen.getByTestId("lang")).toHaveTextContent("en"))
    expect(screen.getByTestId("label")).toHaveTextContent("Sign in")
  })

  it("switches language and persists the choice", async () => {
    renderProbe()
    await waitFor(() => expect(screen.getByTestId("lang")).toHaveTextContent("fr"))

    fireEvent.press(screen.getByTestId("to-en"))

    await waitFor(() => expect(screen.getByTestId("lang")).toHaveTextContent("en"))
    expect(screen.getByTestId("label")).toHaveTextContent("Sign in")
    expect(asyncStorage.setItem).toHaveBeenCalledWith("lang", "en")
  })
})

describe("useLanguage", () => {
  it("throws when used outside of a provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow("useLanguage must be used within LanguageProvider")
    spy.mockRestore()
  })
})
