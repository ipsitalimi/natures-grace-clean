import type { EdgeInsets } from "react-native-safe-area-context";

/**
 * Global layout spacing — use instead of hardcoded top/bottom padding.
 * Safe-area values come from useSafeAreaInsets(); these match `Spacing` in theme.ts.
 * Kept inline here to avoid a circular import (theme must not import this file).
 */
export const LAYOUT = {
  /** Extra space below the status bar / notch (paired with insets.top on headers). */
  headerTopExtra: 8,
  headerBottom: 8,
  screenHorizontal: 16,
  scrollBottomExtra: 16,
  /** Minimum bottom inset when device reports 0 (some Android edge-to-edge cases). */
  minBottomInset: 8,
  authTopExtra: 12,
} as const;

/** Top padding for AppHeader, ScreenHeaderBar, and custom header rows. */
export function getHeaderPaddingTop(insetTop: number): number {
  return insetTop + LAYOUT.headerTopExtra;
}

/** Top padding for full-screen auth / marketing layouts without a header bar. */
export function getAuthScreenPaddingTop(insetTop: number): number {
  return insetTop + LAYOUT.authTopExtra;
}

/** Bottom padding for scroll content above home indicator / tab bar. */
export function getScrollBottomPadding(insetBottom: number, extraBottom = 0): number {
  return Math.max(insetBottom, LAYOUT.minBottomInset) + LAYOUT.scrollBottomExtra + extraBottom;
}

export function headerRowStyle(insets: Pick<EdgeInsets, "top">) {
  return { paddingTop: getHeaderPaddingTop(insets.top) };
}
