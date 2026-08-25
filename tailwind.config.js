/** @type {import('tailwindcss').Config} */

const colors = {
  bg: "#0E1119",
  "bg-soft": "#12161F",
  surface: "#181C27",
  "surface-hi": "#1F2430",
  border: "#252B3A",
  "border-soft": "#1C2230",

  fg: "#F2EDE2",
  "fg-soft": "#CFC9BE",
  muted: "#8A8A95",
  dim: "#5E5F69",

  peach: { DEFAULT: "#F4B585", dim: "rgba(244, 181, 133, 0.14)", on: "#1a0f06" },
  lavender: { DEFAULT: "#C5B1E8", dim: "rgba(197, 177, 232, 0.14)" },
  sage: { DEFAULT: "#A8D4B5", dim: "rgba(168, 212, 181, 0.14)" },
  sky: { DEFAULT: "#9DC7E0", dim: "rgba(157, 199, 224, 0.14)" },
  rose: { DEFAULT: "#E8A8B5", dim: "rgba(232, 168, 181, 0.14)", on: "#1a0a0e" },
}

module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ["InstrumentSans-Regular"],
        "sans-md": ["InstrumentSans-Medium"],
        "sans-sb": ["InstrumentSans-SemiBold"],
        serif: ["InstrumentSerif"],
        "serif-it": ["InstrumentSerif-Italic"],
        mono: ["JetBrainsMono-Regular"],
        "mono-md": ["JetBrainsMono-Medium"],
      },
      letterSpacing: {
        tightest: "-0.6px",
        display: "-0.5px",
        editorial: "-0.35px",
        micro: "1.5px",
        "micro-loose": "2px",
      },
    },
  },
  plugins: [],
}
