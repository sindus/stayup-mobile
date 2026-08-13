import type { ReactElement, ReactNode } from "react"
import { render, type RenderOptions } from "@testing-library/react-native"
import { LanguageProvider } from "@/context/LanguageContext"
import { ThemeProvider } from "@/context/ThemeContext"

function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  )
}

/** Rend un composant enveloppé dans les providers thème + langue (français par défaut). */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Providers, ...options })
}

export { Providers }
