import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";

function safeLiquidGlassAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isLiquidGlassAvailable } = require("expo-glass-effect");
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { theme } = useTheme();

  return {
    headerTitleAlign: "center",
    headerTransparent: transparent,
    ...(Platform.OS === "ios"
      ? { headerBlurEffect: "light" }
      : {}),
    headerTintColor: theme.text,
    headerStyle: {
      backgroundColor: Platform.select({
        ios: undefined,
        android: theme.backgroundRoot,
        web: theme.backgroundRoot,
      }),
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: safeLiquidGlassAvailable() ? false : true,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}
