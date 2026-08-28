/**
 * `providerIcons` (mobile) — le jeu d'icônes nommées n'est atteint que par un
 * `display.icon = "<clé>"` explicite ; les 5 connecteurs officiels fournissent
 * tous un tracé SVG. On exerce ici chaque icône nommée, l'image et le tracé
 * plein / `stroke`.
 */
import type { ReactElement } from "react"
import { render } from "@testing-library/react-native"
import { providerIcon } from "@/components/feed/providerIcons"

const el = (node: ReturnType<typeof providerIcon>) => render(node as ReactElement)

describe("providerIcon — named set", () => {
  it.each(["changelog", "video", "rss", "globe", "table", "book", "dot"])(
    "renders the %s glyph",
    (name) => {
      expect(el(providerIcon({ icon: name })).UNSAFE_root).toBeTruthy()
    },
  )

  it("falls back to the dot for an unknown key and for no display", () => {
    expect(el(providerIcon({ icon: "nope" })).UNSAFE_root).toBeTruthy()
    expect(el(providerIcon(undefined)).UNSAFE_root).toBeTruthy()
  })
})

describe("providerIcon — traced SVG & image", () => {
  it("renders a stroked path set", () => {
    expect(
      el(providerIcon({ icon: { paths: ["M1 1", "M2 2"], viewBox: "0 0 8 8", stroke: true } }))
        .UNSAFE_root,
    ).toBeTruthy()
  })

  it("renders a filled path set when stroke is unset", () => {
    expect(el(providerIcon({ icon: { d: "M3 3", viewBox: "0 0 8 8" } })).UNSAFE_root).toBeTruthy()
  })

  it("renders an image for a data-URI / http icon", () => {
    expect(
      el(providerIcon({ icon: "https://cdn.test/logo.png" }, 20, "#000")).UNSAFE_root,
    ).toBeTruthy()
  })
})
