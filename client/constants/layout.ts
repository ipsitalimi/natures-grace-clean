import { BorderRadius, Colors, Fonts, Shadows } from "@/constants/theme";

/**
 * Global layout design tokens — single source of truth for page structure.
 * Use these for screen shells, headers, titles, gutters, and cards.
 * (Legacy `Spacing` in theme.ts remains for component-level micro-spacing.)
 */
export const LayoutSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Layout = {
  /** Horizontal content gutter — identical on every major screen. */
  gutter: 20,
  /** Extra space below status bar / notch (added once in ScreenHeader). */
  headerTopExtra: LayoutSpacing.sm,
  /** Space below header icon row. */
  headerBottom: LayoutSpacing.sm,
  /** Space below centered page title block. */
  titleBottom: LayoutSpacing.md,
  /** Space below optional subtitle. */
  subtitleBottom: LayoutSpacing.md,
  /** Extra scroll padding above home indicator / tab bar. */
  scrollBottomExtra: LayoutSpacing.md,
  /** Minimum bottom inset when device reports 0. */
  minBottomInset: LayoutSpacing.sm,
  /** Auth / marketing screens without a header bar. */
  authTopExtra: LayoutSpacing.md,
  /** Fixed width of header side columns (icons). */
  headerSideWidth: 80,
  /** Header icon hit area padding. */
  headerIconPadding: LayoutSpacing.sm,
  /** Standard header row height (excluding safe area). */
  headerRowHeight: 56,
  /** Header icon glyph size. */
  headerIconSize: 24,
} as const;

/** Serif title rendered inline with header icons (same baseline row). */
export const HeaderInlineTitleStyle = {
  fontSize: 28,
  lineHeight: 32,
  fontWeight: "600" as const,
  fontFamily: Fonts?.serif ?? "serif",
  letterSpacing: 0.3,
  color: Colors.light.accent,
  textAlign: "center" as const,
};

export const PageTitleStyle = {
  fontSize: 28,
  lineHeight: 34,
  fontWeight: "600" as const,
  fontFamily: Fonts?.serif ?? "serif",
  letterSpacing: 0.4,
  color: Colors.light.accent,
  textAlign: "center" as const,
};

export const PageSubtitleStyle = {
  fontSize: 15,
  lineHeight: 22,
  color: Colors.light.textMuted,
  textAlign: "center" as const,
};

/** Large serif title below the header row on legacy stack screens (34px — unchanged). */
export const BelowHeaderTitleStyle = {
  fontSize: 34,
  lineHeight: 40,
  fontWeight: "600" as const,
  fontFamily: Fonts?.serif ?? "serif",
  letterSpacing: 0.5,
  color: Colors.light.accent,
  textAlign: "center" as const,
};

export const CardTokens = {
  radius: 16,
  padding: LayoutSpacing.md,
  paddingCompact: LayoutSpacing.sm,
  gap: LayoutSpacing.sm,
  backgroundColor: Colors.light.cardBackground,
  ...Shadows.soft,
};
