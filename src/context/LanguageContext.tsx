import { createContext, useContext, useState, useEffect } from "react"
import { fr, en, type Translations, type Language } from "@/lib/translations"
import { readLang, writeLang } from "@/lib/store"

const dictionaries: Record<Language, Translations> = { fr, en }

interface LanguageContextType {
  lang: Language
  t: Translations
  setLang: (l: Language) => void
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("fr")

  useEffect(() => {
    readLang().then((stored) => {
      if (stored) setLangState(stored)
    })
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    writeLang(newLang)
  }

  return (
    <LanguageContext.Provider value={{ lang, t: dictionaries[lang], setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}
