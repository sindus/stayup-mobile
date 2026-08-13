import { fr, en } from "../src/lib/translations"

type Dict = { [key: string]: string | Dict }

function paths(dict: Dict, prefix = ""): string[] {
  return Object.entries(dict).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === "string" ? [path] : paths(value, path)
  })
}

describe("translations", () => {
  it("exposes the same keys in French and English", () => {
    expect(paths(en as unknown as Dict).sort()).toEqual(paths(fr as unknown as Dict).sort())
  })

  it("has no empty value", () => {
    for (const dict of [fr, en]) {
      const flat = dict as unknown as Dict
      for (const path of paths(flat)) {
        const value = path.split(".").reduce<string | Dict>((acc, k) => (acc as Dict)[k], flat)
        expect(value).not.toBe("")
      }
    }
  })

  it("keeps a label for every provider", () => {
    expect(Object.keys(fr.feed.providers).sort()).toEqual(["changelog", "rss", "scrap", "youtube"])
    expect(Object.keys(en.feed.providers).sort()).toEqual(Object.keys(fr.feed.providers).sort())
  })

  it("no longer exposes documentation keys", () => {
    expect(fr).not.toHaveProperty("documentation")
    expect(en).not.toHaveProperty("documentation")
    expect(fr.tabs).not.toHaveProperty("docs")
    expect(fr.feed.providers).not.toHaveProperty("documentation")
  })
})
