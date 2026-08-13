export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismiss: jest.fn(),
}

/** Rendu à la place de <Redirect /> : on inspecte ses props pour vérifier les redirections. */
export const mockRedirect = jest.fn(() => null)

const mockState: { params: Record<string, string> } = { params: {} }

export function setMockParams(params: Record<string, string>) {
  mockState.params = params
}

/** Cible de la redirection déclenchée pendant le rendu, ou null. */
export function redirectedTo(): string | null {
  const call = mockRedirect.mock.calls[0] as unknown as [{ href: string }] | undefined
  return call ? call[0].href : null
}

jest.mock("expo-router", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => children ?? null

  /**
   * Rend l'icône déclarée dans les options de l'onglet, afin que les callbacks
   * `tabBarIcon` des écrans soient réellement exécutés par les tests.
   */
  const TabScreen = ({
    options,
  }: {
    options?: { tabBarIcon?: (p: { color: string; size: number }) => React.ReactNode }
  }) => options?.tabBarIcon?.({ color: "#6366f1", size: 24 }) ?? null

  return {
    router: mockRouter,
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockState.params,
    Redirect: mockRedirect,
    Link: passthrough,
    Stack: Object.assign(passthrough, { Screen: () => null }),
    Tabs: Object.assign(passthrough, { Screen: TabScreen }),
  }
})

// expo-secure-store et async-storage sont branchés via moduleNameMapper (jest.config.js).

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: "cancel" }),
}))

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "stayup://auth/callback"),
}))

jest.mock("expo-linking", () => ({
  createURL: (path: string) => `stayup://${path}`,
  useURL: () => null,
}))

jest.mock("expo-image", () => ({ Image: require("react-native").Image }))

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native")
  const inset = { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    SafeAreaProvider: View,
    SafeAreaView: View,
    SafeAreaInsetsContext: { Consumer: View, Provider: View },
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  }
})

jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: require("react-native").View,
}))

jest.mock("react-native-webview", () => ({ WebView: require("react-native").View }))

// nativewind : son runtime natif n'est pas disponible sous Jest (cf. babel.config.js).
jest.mock("nativewind", () => ({
  colorScheme: { set: jest.fn(), get: jest.fn(() => "light") },
  useColorScheme: () => ({ colorScheme: "light", setColorScheme: jest.fn() }),
}))

// Icônes : chaque icône devient une <View testID="icon-<Nom>" />, ce qui donne
// une prise stable sur les boutons qui n'affichent qu'une icône.
jest.mock("lucide-react-native", () => {
  const React = require("react")
  const { View } = require("react-native")

  return new Proxy(
    {},
    {
      get(cache: Record<string, unknown>, name: string) {
        if (name === "__esModule") return true
        if (!cache[name]) {
          const Icon = () => React.createElement(View, { testID: `icon-${name}` })
          Icon.displayName = name
          cache[name] = Icon
        }
        return cache[name]
      },
    },
  )
})

beforeEach(() => {
  mockState.params = {}
})

afterEach(() => {
  jest.clearAllMocks()
})
