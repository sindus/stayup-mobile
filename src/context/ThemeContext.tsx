import { createContext, useContext, useState, useEffect } from "react"
import { useColorScheme } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { colorScheme as nativewindColorScheme } from "nativewind"

type Theme = "light" | "dark"
export type { Theme }

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const THEME_KEY = "theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [theme, setThemeState] = useState<Theme>(systemScheme === "dark" ? "dark" : "light")

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === "light" || stored === "dark") {
        setThemeState(stored)
        nativewindColorScheme.set(stored)
      } else {
        const resolved = systemScheme === "dark" ? "dark" : "light"
        setThemeState(resolved)
        nativewindColorScheme.set(resolved)
      }
    })
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    nativewindColorScheme.set(t)
    AsyncStorage.setItem(THEME_KEY, t)
  }

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
