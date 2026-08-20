import type { ReactElement, ReactNode } from "react"
import { render, type RenderOptions } from "@testing-library/react-native"
import { LanguageProvider } from "@/context/LanguageContext"
import { ThemeProvider } from "@/context/ThemeContext"
import type { Language } from "@/lib/translations"

function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider initialLang="fr">{children}</LanguageProvider>
    </ThemeProvider>
  )
}

function makeProviders(lang: Language) {
  return function ProvidersWithLang({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider>
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
      </ThemeProvider>
    )
  }
}

/** Rend un composant enveloppé dans les providers thème + langue (français par défaut). */
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { lang?: Language },
) {
  const { lang, ...rest } = options ?? {}
  return render(ui, { wrapper: lang ? makeProviders(lang) : Providers, ...rest })
}

export { Providers }
