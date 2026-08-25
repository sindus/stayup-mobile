/**
 * Aurora design tokens — TypeScript module
 *
 * StayUp Mobile (React Native + Expo) theme module.
 * Import from anywhere: `import { colors, provider } from '@/theme'`.
 */

export const colors = {
  // Foundation
  bg: "#0E1119",
  bgSoft: "#12161F",
  surface: "#181C27",
  surfaceHi: "#1F2430",
  border: "#252B3A",
  borderSoft: "#1C2230",

  // Foreground
  fg: "#F2EDE2",
  fgSoft: "#CFC9BE",
  muted: "#8A8A95",
  dim: "#5E5F69",

  // Accents
  peach: "#F4B585",
  peachDim: "rgba(244, 181, 133, 0.14)",
  peachMid: "rgba(244, 181, 133, 0.30)",
  peachOn: "#1a0f06", // text on peach bg

  lavender: "#C5B1E8",
  lavenderDim: "rgba(197, 177, 232, 0.14)",

  sage: "#A8D4B5",
  sageDim: "rgba(168, 212, 181, 0.14)",

  sky: "#9DC7E0",
  skyDim: "rgba(157, 199, 224, 0.14)",

  rose: "#E8A8B5",
  roseDim: "rgba(232, 168, 181, 0.14)",
  roseOn: "#1a0a0e",
} as const

export const fonts = {
  sans: "InstrumentSans-Regular",
  sansMedium: "InstrumentSans-Medium",
  sansSemiBold: "InstrumentSans-SemiBold",
  serif: "InstrumentSerif",
  serifItalic: "InstrumentSerif-Italic",
  mono: "JetBrainsMono-Regular",
  monoMedium: "JetBrainsMono-Medium",
} as const

export const motion = {
  fast: 120,
  base: 150,
  hover: 140,
  pop: 180,
  slideIn: 200,
  shimmer: 1400,
  spin: 900,
} as const

// Provider color mapping (for icons, version chips, focus borders)
export const provider = {
  changelog: { color: colors.peach, dim: colors.peachDim, label: "GitHub" },
  youtube: { color: colors.rose, dim: colors.roseDim, label: "YouTube" },
  rss: { color: colors.sage, dim: colors.sageDim, label: "RSS" },
  scrap: { color: colors.sky, dim: colors.skyDim, label: "Web" },
} as const

export type ProviderKey = keyof typeof provider

export const aurora = { colors, fonts, motion, provider } as const

export default aurora
