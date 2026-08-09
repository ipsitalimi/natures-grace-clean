import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#013220",
    textSecondary: "#013220",
    textMuted: "#013220",
    buttonText: "#FFFFFF",
    tabIconDefault: "#013220",
    tabIconSelected: "#013220",
    link: "#013220",
    primary: "#013220",
    accent: "#013220",
    backgroundRoot: "#E8EDDF",
    backgroundDefault: "#E8EDDF",
    backgroundSecondary: "#AAB494",
    backgroundTertiary: "#9CA888",
    cardBackground: "#F5F3EE",
    cardBackgroundAlt: "#EDE9E2",
    divider: "#C4A97A",
    brown: "#6B5640",
    brownLight: "#C4A97A",
    brownDark: "#6B5640",
    button: "#013220",
    buttonPressed: "#013220",
    navBar: "#E8EDDF",
    navBarText: "#013220",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

const androidHeadingFix =
  Platform.OS === "android"
    ? ({ includeFontPadding: false, textAlignVertical: "center" as const } as const)
    : ({} as const);

export const Typography = {
  h1: {
    fontSize: 32,
    lineHeight: 42,
    fontWeight: "700" as const,
    ...androidHeadingFix,
  },
  h2: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: "700" as const,
    ...androidHeadingFix,
  },
  h3: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "600" as const,
    ...androidHeadingFix,
  },
  h4: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "600" as const,
    ...androidHeadingFix,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Shadows = {
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
