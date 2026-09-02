import { screen, fireEvent, waitFor } from "@testing-library/react-native"
import { InstancesSheet } from "@/components/instances/InstancesSheet"
import { probeApiUrl, type AuthConfig } from "@/lib/api"
import { fr } from "@/lib/translations/fr"
import { renderWithProviders } from "./render"

jest.mock("@/lib/api", () => ({
  probeApiUrl: jest.fn(),
  loginWithPassword: jest.fn(),
  registerWithPassword: jest.fn(),
}))

const mockedProbe = probeApiUrl as jest.Mock

const OK_CONFIG: AuthConfig = {
  name: null,
  registrationMode: "open",
  emailPassword: true,
  oauth: { github: true, google: true },
}

const primary = { id: "i1", url: "https://a.example.com", name: "Alpha", token: "jwt-a" }
const secondary = { id: "i2", url: "https://b.example.com", name: "Beta", token: "jwt-b" }

function buildAuth() {
  return {
    session: null,
    sessions: [] as { instanceId: string; expired: boolean }[],
    instances: [primary, secondary],
    loading: false,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    loginOAuth: jest.fn(),
    logout: jest.fn(),
    addInstance: jest.fn().mockResolvedValue(null),
    registerInstance: jest.fn().mockResolvedValue({}),
    reconnectInstance: jest.fn().mockResolvedValue(null),
    removeInstance: jest.fn().mockResolvedValue(undefined),
    renameInstance: jest.fn().mockResolvedValue(undefined),
    setPrimary: jest.fn().mockResolvedValue(undefined),
  }
}

function renderSheet(auth = buildAuth()) {
  const onClose = jest.fn()
  renderWithProviders(<InstancesSheet visible onClose={onClose} auth={auth as never} />)
  return { auth, onClose }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedProbe.mockResolvedValue({ ok: true, config: OK_CONFIG })
})

describe("InstancesSheet", () => {
  it("lists instances and tags the first as primary", () => {
    renderSheet()
    expect(screen.getByDisplayValue("Alpha")).toBeTruthy()
    expect(screen.getByDisplayValue("Beta")).toBeTruthy()
    expect(screen.getByText(fr.instances.primary)).toBeTruthy()
    expect(screen.getByText("a.example.com")).toBeTruthy()
  })

  it("renames an instance on end-editing when the value changed", () => {
    const { auth } = renderSheet()
    const field = screen.getByDisplayValue("Beta")
    fireEvent(field, "endEditing", { nativeEvent: { text: "Renamed" } })
    expect(auth.renameInstance).toHaveBeenCalledWith("i2", "Renamed")
  })

  it("does not rename when unchanged", () => {
    const { auth } = renderSheet()
    fireEvent(screen.getByDisplayValue("Beta"), "endEditing", { nativeEvent: { text: "Beta" } })
    expect(auth.renameInstance).not.toHaveBeenCalled()
  })

  it("promotes a secondary instance to primary", () => {
    const { auth } = renderSheet()
    fireEvent.press(screen.getByText(fr.instances.makePrimary))
    expect(auth.setPrimary).toHaveBeenCalledWith("i2")
  })

  it("removes an instance", () => {
    const { auth } = renderSheet()
    fireEvent.press(screen.getAllByText(fr.instances.remove)[1])
    expect(auth.removeInstance).toHaveBeenCalledWith("i2")
  })

  it("checks a URL then adds an instance with email + password", async () => {
    const { auth } = renderSheet()
    fireEvent.press(screen.getByText(fr.instances.add))

    fireEvent.changeText(
      screen.getByPlaceholderText(fr.instances.urlPlaceholder),
      "https://c.example.com",
    )
    fireEvent.press(screen.getByText(fr.instances.next))

    await waitFor(() => expect(probeApiUrl).toHaveBeenCalledWith("https://c.example.com"))

    fireEvent.changeText(screen.getByPlaceholderText("ton@email.com"), "u@x.io")
    fireEvent.changeText(screen.getByPlaceholderText("mot de passe"), "pw")
    fireEvent.press(screen.getByText(fr.auth.signIn))

    await waitFor(() =>
      expect(auth.addInstance).toHaveBeenCalledWith("https://c.example.com", {
        kind: "password",
        email: "u@x.io",
        password: "pw",
      }),
    )
  })

  async function openConnectForm(value = "https://c.example.com") {
    fireEvent.press(screen.getByText(fr.instances.add))
    fireEvent.changeText(screen.getByPlaceholderText(fr.instances.urlPlaceholder), value)
    fireEvent.press(screen.getByText(fr.instances.next))
    await screen.findByPlaceholderText("ton@email.com")
  }

  it("creates an account on the new server via the register form", async () => {
    const { auth } = renderSheet()
    await openConnectForm()

    fireEvent.press(screen.getByText(fr.auth.signUp)) // toggle → register
    fireEvent.changeText(screen.getByPlaceholderText(fr.auth.namePlaceholder), "Bea")
    fireEvent.changeText(screen.getByPlaceholderText("ton@email.com"), "bea@x.io")
    fireEvent.changeText(screen.getByPlaceholderText("mot de passe"), "pass1234")
    fireEvent.press(screen.getByText(fr.auth.signUp)) // register submit

    await waitFor(() =>
      expect(auth.registerInstance).toHaveBeenCalledWith("https://c.example.com", {
        name: "Bea",
        email: "bea@x.io",
        password: "pass1234",
      }),
    )
  })

  it("shows the pending-approval notice when the server needs admin approval", async () => {
    const auth = {
      ...buildAuth(),
      registerInstance: jest.fn().mockResolvedValue({ pending: true }),
    }
    renderSheet(auth)
    await openConnectForm()

    fireEvent.press(screen.getByText(fr.auth.signUp))
    fireEvent.changeText(screen.getByPlaceholderText(fr.auth.namePlaceholder), "Bea")
    fireEvent.changeText(screen.getByPlaceholderText("ton@email.com"), "bea@x.io")
    fireEvent.changeText(screen.getByPlaceholderText("mot de passe"), "pass1234")
    fireEvent.press(screen.getByText(fr.auth.signUp))

    expect(await screen.findByText(fr.auth.accountPending)).toBeTruthy()
    expect(screen.queryByPlaceholderText(fr.instances.urlPlaceholder)).toBeNull()
  })

  it("shows the approval hint in the register form for an approval-mode server", async () => {
    mockedProbe.mockResolvedValue({
      ok: true,
      config: { ...OK_CONFIG, registrationMode: "approval" },
    })
    renderSheet()
    await openConnectForm()

    expect(screen.queryByText(fr.auth.pendingApprovalHint)).toBeNull()
    fireEvent.press(screen.getByText(fr.auth.signUp))
    expect(screen.getByText(fr.auth.pendingApprovalHint)).toBeTruthy()
  })

  it("adds an instance through an OAuth provider", async () => {
    const { auth } = renderSheet()
    fireEvent.press(screen.getByText(fr.instances.add))
    fireEvent.changeText(
      screen.getByPlaceholderText(fr.instances.urlPlaceholder),
      "https://c.example.com",
    )
    fireEvent.press(screen.getByText(fr.instances.next))
    await screen.findByText(fr.auth.continueWithGitHub)

    fireEvent.press(screen.getByText(fr.auth.continueWithGitHub))

    await waitFor(() =>
      expect(auth.addInstance).toHaveBeenCalledWith("https://c.example.com", {
        kind: "oauth",
        provider: "github",
      }),
    )
  })

  it("surfaces an add error and keeps the form open", async () => {
    const auth = { ...buildAuth(), addInstance: jest.fn().mockResolvedValue("Nope") }
    renderSheet(auth)
    fireEvent.press(screen.getByText(fr.instances.add))
    fireEvent.changeText(
      screen.getByPlaceholderText(fr.instances.urlPlaceholder),
      "https://c.example.com",
    )
    fireEvent.press(screen.getByText(fr.instances.next))
    await screen.findByPlaceholderText("ton@email.com")

    fireEvent.changeText(screen.getByPlaceholderText("ton@email.com"), "u@x.io")
    fireEvent.changeText(screen.getByPlaceholderText("mot de passe"), "pw")
    fireEvent.press(screen.getByText(fr.auth.signIn))

    expect(await screen.findByText("Nope")).toBeTruthy()
  })

  it("offers a reconnect form for an expired session and cancels the add form", async () => {
    const auth = { ...buildAuth(), sessions: [{ instanceId: "i2", expired: true }] }
    renderSheet(auth)

    expect(screen.getByText(fr.instances.expired)).toBeTruthy()
    fireEvent.press(screen.getByText(fr.instances.reconnect))
    fireEvent.changeText(screen.getByPlaceholderText("ton@email.com"), "u@x.io")
    fireEvent.changeText(screen.getByPlaceholderText("mot de passe"), "pw")
    fireEvent.press(screen.getByText(fr.auth.signIn))

    await waitFor(() =>
      expect(auth.reconnectInstance).toHaveBeenCalledWith("i2", {
        kind: "password",
        email: "u@x.io",
        password: "pw",
      }),
    )
  })

  it("with autoReason, banners the dead sessions and opens the first reconnect form", () => {
    const onClose = jest.fn()
    renderWithProviders(
      <InstancesSheet
        visible
        onClose={onClose}
        auth={buildAuth() as never}
        autoReason={[{ instanceId: "i2", instanceName: "Beta" }]}
      />,
    )
    expect(screen.getByText(new RegExp(`${fr.instances.reconnectPrompt}.*Beta`))).toBeTruthy()
    // Reconnect UI shows even though the session is not locally `expired`…
    expect(screen.getByText(fr.instances.expired)).toBeTruthy()
    // …and its form is already expanded.
    expect(screen.getByPlaceholderText("ton@email.com")).toBeTruthy()
  })

  it("cancels the add form", () => {
    renderSheet()
    fireEvent.press(screen.getByText(fr.instances.add))
    fireEvent.press(screen.getByText(fr.instances.cancel))
    expect(screen.queryByPlaceholderText(fr.instances.urlPlaceholder)).toBeNull()
  })

  it("closes from the header X and the backdrop", () => {
    const { onClose } = renderSheet()
    fireEvent.press(screen.getByTestId("icon-X"))
    expect(onClose).toHaveBeenCalled()
  })

  it("keeps the sheet open when the body itself is pressed", () => {
    const { onClose } = renderSheet()
    const stopPropagation = jest.fn()
    fireEvent.press(screen.getByText(fr.instances.subtitle), { stopPropagation })
    expect(stopPropagation).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("rejects an unreachable URL and never shows the connect form", async () => {
    mockedProbe.mockResolvedValue({ ok: false, reason: "unreachable" })
    renderSheet()
    fireEvent.press(screen.getByText(fr.instances.add))
    fireEvent.changeText(
      screen.getByPlaceholderText(fr.instances.urlPlaceholder),
      "https://nope.example.com",
    )
    fireEvent.press(screen.getByText(fr.instances.next))

    expect(await screen.findByText(fr.instances.urlUnreachable)).toBeTruthy()
    expect(screen.queryByText(fr.auth.continueWithGitHub)).toBeNull()
  })

  it("rejects a URL that is not a StayUp API", async () => {
    mockedProbe.mockResolvedValue({ ok: false, reason: "incompatible" })
    renderSheet()
    fireEvent.press(screen.getByText(fr.instances.add))
    fireEvent.changeText(
      screen.getByPlaceholderText(fr.instances.urlPlaceholder),
      "https://example.com",
    )
    fireEvent.press(screen.getByText(fr.instances.next))

    expect(await screen.findByText(fr.instances.urlIncompatible)).toBeTruthy()
    expect(screen.queryByText(fr.auth.continueWithGitHub)).toBeNull()
  })

  it("reconnects an expired session through an OAuth provider", async () => {
    const auth = { ...buildAuth(), sessions: [{ instanceId: "i2", expired: true }] }
    renderSheet(auth)

    fireEvent.press(screen.getByText(fr.instances.reconnect))
    fireEvent.press(await screen.findByText(fr.auth.continueWithGitHub))

    await waitFor(() =>
      expect(auth.reconnectInstance).toHaveBeenCalledWith("i2", {
        kind: "oauth",
        provider: "github",
      }),
    )
  })

  it("surfaces a reconnect error", async () => {
    const auth = {
      ...buildAuth(),
      sessions: [{ instanceId: "i2", expired: true }],
      reconnectInstance: jest.fn().mockResolvedValue("Reconnect failed"),
    }
    renderSheet(auth)

    fireEvent.press(screen.getByText(fr.instances.reconnect))
    fireEvent.changeText(screen.getByPlaceholderText("ton@email.com"), "u@x.io")
    fireEvent.changeText(screen.getByPlaceholderText("mot de passe"), "pw")
    fireEvent.press(screen.getByText(fr.auth.signIn))

    expect(await screen.findByText("Reconnect failed")).toBeTruthy()
  })
})
