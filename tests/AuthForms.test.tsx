import { TextInput } from "react-native"
import { screen, fireEvent, waitFor } from "@testing-library/react-native"
import { LoginForm } from "@/components/auth/LoginForm"
import { RegisterForm } from "@/components/auth/RegisterForm"
import { OAuthButtons } from "@/components/auth/OAuthButtons"
import { renderWithProviders } from "./render"

function inputs() {
  return screen.UNSAFE_getAllByType(TextInput)
}

describe("LoginForm", () => {
  it("submits the trimmed credentials", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    renderWithProviders(<LoginForm onSubmit={onSubmit} loading={false} error={null} />)

    const [email, password] = inputs()
    fireEvent.changeText(email, "jean@example.com")
    fireEvent.changeText(password, "password")
    fireEvent.press(screen.getByText("Se connecter"))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("jean@example.com", "password"))
  })

  it("rejects an invalid email", async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<LoginForm onSubmit={onSubmit} loading={false} error={null} />)

    fireEvent.changeText(inputs()[0], "pas-un-email")
    fireEvent.changeText(inputs()[1], "password")
    fireEvent.press(screen.getByText("Se connecter"))

    await waitFor(() => expect(screen.getByText("Email invalide")).toBeTruthy())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("requires a non-empty password", async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<LoginForm onSubmit={onSubmit} loading={false} error={null} />)

    fireEvent.changeText(inputs()[0], "jean@example.com")
    fireEvent.changeText(inputs()[1], "a")
    fireEvent.changeText(inputs()[1], "")
    fireEvent.press(screen.getByText("Se connecter"))

    await waitFor(() => expect(screen.getByText("Mot de passe requis")).toBeTruthy())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows the server error", () => {
    renderWithProviders(
      <LoginForm onSubmit={jest.fn()} loading={false} error="Identifiants invalides." />,
    )
    expect(screen.getByText("Identifiants invalides.")).toBeTruthy()
  })

  it("hides the label while loading", () => {
    renderWithProviders(<LoginForm onSubmit={jest.fn()} loading error={null} />)
    expect(screen.queryByText("Se connecter")).toBeNull()
  })
})

describe("RegisterForm", () => {
  it("submits name, email and password", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    renderWithProviders(<RegisterForm onSubmit={onSubmit} loading={false} error={null} />)

    const [name, email, password] = inputs()
    fireEvent.changeText(name, "Jean")
    fireEvent.changeText(email, "jean@example.com")
    fireEvent.changeText(password, "password123")
    fireEvent.press(screen.getByText("Créer un compte"))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("Jean", "jean@example.com", "password123"),
    )
  })

  it("requires a non-empty name", async () => {
    renderWithProviders(<RegisterForm onSubmit={jest.fn()} loading={false} error={null} />)

    fireEvent.changeText(inputs()[0], "a")
    fireEvent.changeText(inputs()[0], "")
    fireEvent.changeText(inputs()[1], "jean@example.com")
    fireEvent.changeText(inputs()[2], "password123")
    fireEvent.press(screen.getByText("Créer un compte"))

    await waitFor(() => expect(screen.getByText("Nom requis")).toBeTruthy())
  })

  it("rejects a password shorter than 8 characters", async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<RegisterForm onSubmit={onSubmit} loading={false} error={null} />)

    fireEvent.changeText(inputs()[0], "Jean")
    fireEvent.changeText(inputs()[1], "jean@example.com")
    fireEvent.changeText(inputs()[2], "court")
    fireEvent.press(screen.getByText("Créer un compte"))

    await waitFor(() => expect(screen.getByText("8 caractères minimum")).toBeTruthy())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("rejects an invalid email", async () => {
    renderWithProviders(<RegisterForm onSubmit={jest.fn()} loading={false} error={null} />)

    fireEvent.changeText(inputs()[0], "Jean")
    fireEvent.changeText(inputs()[1], "nope")
    fireEvent.changeText(inputs()[2], "password123")
    fireEvent.press(screen.getByText("Créer un compte"))

    await waitFor(() => expect(screen.getByText("Email invalide")).toBeTruthy())
  })

  it("shows the server error", () => {
    renderWithProviders(
      <RegisterForm
        onSubmit={jest.fn()}
        loading={false}
        error="Un compte existe déjà avec cet email."
      />,
    )
    expect(screen.getByText("Un compte existe déjà avec cet email.")).toBeTruthy()
  })

  it("hides the label while loading", () => {
    renderWithProviders(<RegisterForm onSubmit={jest.fn()} loading error={null} />)
    expect(screen.queryByText("Créer un compte")).toBeNull()
  })
})

describe("OAuthButtons", () => {
  it("reports the chosen provider", () => {
    const onPress = jest.fn().mockResolvedValue(undefined)
    renderWithProviders(<OAuthButtons onPress={onPress} loading={false} />)

    fireEvent.press(screen.getByText("Continuer avec GitHub"))
    expect(onPress).toHaveBeenCalledWith("github")

    fireEvent.press(screen.getByText("Continuer avec Google"))
    expect(onPress).toHaveBeenCalledWith("google")
  })

  it("hides both labels while loading", () => {
    renderWithProviders(<OAuthButtons onPress={jest.fn()} loading />)

    expect(screen.queryByText("Continuer avec GitHub")).toBeNull()
    expect(screen.queryByText("Continuer avec Google")).toBeNull()
  })
})
