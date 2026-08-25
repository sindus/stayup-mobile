import "../global.css"
import { useFonts } from "expo-font"
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from "@expo-google-fonts/instrument-sans"
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from "@expo-google-fonts/instrument-serif"
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono"
import { Stack } from "expo-router"
import { View } from "react-native"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { ThemeProvider } from "@/context/ThemeContext"
import { LanguageProvider } from "@/context/LanguageContext"
import { colors } from "@/theme"

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "InstrumentSans-Regular": InstrumentSans_400Regular,
    "InstrumentSans-Medium": InstrumentSans_500Medium,
    "InstrumentSans-SemiBold": InstrumentSans_600SemiBold,
    InstrumentSerif: InstrumentSerif_400Regular,
    "InstrumentSerif-Italic": InstrumentSerif_400Regular_Italic,
    "JetBrainsMono-Regular": JetBrainsMono_400Regular,
    "JetBrainsMono-Medium": JetBrainsMono_500Medium,
  })

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
            />
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
