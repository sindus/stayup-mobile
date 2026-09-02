import { en, fr, de, es, it as itLang, pt, ja, zh } from "../src/lib/translations"

type Dict = { [key: string]: string | Dict }

const dictionaries = { en, fr, de, es, it: itLang, pt, ja, zh }

function paths(dict: Dict, prefix = ""): string[] {
  return Object.entries(dict).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === "string" ? [path] : paths(value, path)
  })
}

describe("translations", () => {
  it("exposes the same keys in every language", () => {
    const referencePaths = paths(en as unknown as Dict).sort()
    for (const dict of Object.values(dictionaries)) {
      expect(paths(dict as unknown as Dict).sort()).toEqual(referencePaths)
    }
  })

  it("has no empty value", () => {
    for (const dict of Object.values(dictionaries)) {
      const flat = dict as unknown as Dict
      for (const path of paths(flat)) {
        const value = path.split(".").reduce<string | Dict>((acc, k) => (acc as Dict)[k], flat)
        expect(value).not.toBe("")
      }
    }
  })

  it("no longer exposes documentation keys", () => {
    for (const dict of Object.values(dictionaries)) {
      expect(dict).not.toHaveProperty("documentation")
      expect(dict.tabs).not.toHaveProperty("docs")
    }
  })
})
