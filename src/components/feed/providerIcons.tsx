import type { ReactNode } from "react"
import Svg, { Path, Rect, Circle, Ellipse, Line } from "react-native-svg"
import { Image } from "expo-image"
import type { ProviderTemplate } from "@/lib/providerTemplate"
import { resolveIcon } from "@/lib/providerTemplate"

/**
 * Jeu d'icônes intégré (raccourci pour `display.icon = "<clé>"`). Un template
 * peut aussi fournir son propre tracé SVG, une data-URI ou une URL d'image.
 * React Native n'a pas de `currentColor` : la couleur est passée en paramètre.
 */
const NAMED: Record<string, (size: number, color: string) => ReactNode> = {
  changelog: (s, c) => (
    <Svg width={s} height={s} viewBox="0 0 14 14">
      <Path d="M7 1L9.5 4H11.5L7 1ZM7 1L4.5 4H2.5L7 1Z" fill={c} opacity={0.8} />
      <Rect x={2} y={4} width={10} height={1} rx={0.5} fill={c} />
      <Rect x={3} y={6.5} width={8} height={1} rx={0.5} fill={c} opacity={0.5} />
      <Rect x={3} y={8.5} width={6} height={1} rx={0.5} fill={c} opacity={0.5} />
    </Svg>
  ),
  video: (s, c) => (
    <Svg width={s} height={s} viewBox="0 0 14 14">
      <Rect x={1} y={3} width={12} height={8} rx={2} fill={c} />
      <Path d="M5.5 5.5L9 7L5.5 8.5V5.5Z" fill="#fff" />
    </Svg>
  ),
  rss: (s, c) => (
    <Svg width={s} height={s} viewBox="0 0 14 14">
      <Circle cx={3} cy={11} r={1.5} fill={c} />
      <Path d="M2 7.5C5 7.5 6.5 9 6.5 11.5" stroke={c} strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M2 4C7 4 10 7 10 12" stroke={c} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  ),
  globe: (s, c) => (
    <Svg width={s} height={s} viewBox="0 0 14 14">
      <Circle cx={7} cy={7} r={5} stroke={c} strokeWidth={1.2} />
      <Ellipse cx={7} cy={7} rx={2} ry={5} stroke={c} strokeWidth={1.2} />
      <Line x1={2} y1={7} x2={12} y2={7} stroke={c} strokeWidth={1.2} />
    </Svg>
  ),
  table: (s, c) => (
    <Svg width={s} height={s} viewBox="0 0 14 14">
      <Rect x={1.5} y={2} width={11} height={10} rx={1.5} stroke={c} strokeWidth={1.2} />
      <Line x1={1.5} y1={5.5} x2={12.5} y2={5.5} stroke={c} strokeWidth={1.2} />
      <Line x1={5.5} y1={5.5} x2={5.5} y2={12} stroke={c} strokeWidth={1.2} />
    </Svg>
  ),
  book: (s, c) => (
    <Svg width={s} height={s} viewBox="0 0 14 14">
      <Path
        d="M2 2.5h4.5A1.5 1.5 0 0 1 8 4v8a1.2 1.2 0 0 0-1.2-1.2H2V2.5Z"
        stroke={c}
        strokeWidth={1.1}
      />
      <Path
        d="M12 2.5H7.5A1.5 1.5 0 0 0 6 4v8a1.2 1.2 0 0 1 1.2-1.2H12V2.5Z"
        stroke={c}
        strokeWidth={1.1}
      />
    </Svg>
  ),
  dot: (s, c) => (
    <Svg width={s} height={s} viewBox="0 0 14 14">
      <Circle cx={7} cy={7} r={5.5} stroke={c} strokeWidth={1.2} />
    </Svg>
  ),
}

/**
 * Icône d'un provider, pilotée par `display.icon` :
 * clé du jeu intégré · tracé SVG `{ paths|d, viewBox, stroke }` · data-URI · URL image.
 */
export function providerIcon(
  display: ProviderTemplate["display"] | undefined,
  size = 14,
  color = "#8A8A95",
): ReactNode {
  const spec = resolveIcon(display)
  if (spec.kind === "named") return (NAMED[spec.name] ?? NAMED.dot)(size, color)
  if (spec.kind === "image") {
    return (
      <Image
        source={{ uri: spec.src }}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    )
  }
  return (
    <Svg width={size} height={size} viewBox={spec.viewBox}>
      {spec.paths.map((d, i) =>
        spec.stroke ? (
          <Path
            key={i}
            d={d}
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <Path key={i} d={d} fill={color} />
        ),
      )}
    </Svg>
  )
}
