import Svg, { Defs, RadialGradient, LinearGradient, Stop, Circle, Rect } from "react-native-svg"
import { colors } from "@/theme"

interface AuroraMarkProps {
  size?: number
}

export function AuroraMark({ size = 28 }: AuroraMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <RadialGradient id="aurora-sun" cx="50%" cy="55%" r="55%">
          <Stop offset="0%" stopColor="#FFD4A8" />
          <Stop offset="55%" stopColor={colors.peach} />
          <Stop offset="100%" stopColor="#D88A52" />
        </RadialGradient>
        <LinearGradient id="aurora-h" x1="0" y1="0" x2="32" y2="0">
          <Stop offset="0%" stopColor={colors.peach} stopOpacity="0" />
          <Stop offset="50%" stopColor={colors.peach} stopOpacity="0.65" />
          <Stop offset="100%" stopColor={colors.peach} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Circle
        cx={16}
        cy={16}
        r={14}
        fill={colors.surface}
        stroke={colors.border}
        strokeWidth={0.5}
      />
      <Circle cx={16} cy={19} r={7.5} fill="url(#aurora-sun)" />
      <Rect x={3} y={20.5} width={26} height={0.8} fill="url(#aurora-h)" />
    </Svg>
  )
}
