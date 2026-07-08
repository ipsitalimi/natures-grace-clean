import type { EdgeInsets } from "react-native-safe-area-context";

import { Layout, LayoutSpacing } from "@/constants/layout";

/**
 * Safe-area helpers — top inset is applied once in ScreenHeader / PageLayout.
 * Do NOT wrap the app root in SafeAreaView edges top.
 */
export const LAYOUT = Layout;

/** Re-export spacing scale for layout shells. */
export { LayoutSpacing };

/** Top padding for header rows (status bar + small breathing room). */
export function getHeaderPaddingTop(insetTop: number): number {
  return insetTop + Layout.headerTopExtra;
}

/** Tighter top padding for compact home-style headers. */
export function getCompactHeaderPaddingTop(insetTop: number): number {
  return insetTop + LayoutSpacing.xs;
}

/** Top padding for full-screen auth layouts without a header bar. */
export function getAuthScreenPaddingTop(insetTop: number): number {
  return insetTop + Layout.authTopExtra;
}

/** Bottom padding for scroll content above home indicator / tab bar. */
export function getScrollBottomPadding(insetBottom: number, extraBottom = 0): number {
  return Math.max(insetBottom, Layout.minBottomInset) + Layout.scrollBottomExtra + extraBottom;
}

/** Body height of sticky CTA content (top padding + button row), excluding safe area. */
export const STICKY_ACTION_BAR_BODY_HEIGHT = 80;

/** Extra space below the button inside the bar (all platforms). */
export const STICKY_ACTION_BAR_EXTRA_BOTTOM = LayoutSpacing.xl;

/** Minimum bottom breathing room when safe-area inset is 0 (common on Android). */
export const STICKY_ACTION_BAR_MIN_BOTTOM = LayoutSpacing.xl;

/** Inner bottom padding for sticky bar content (SafeAreaView adds device inset separately). */
export function getStickyActionBarInnerBottomPadding(insetBottom: number): number {
  return STICKY_ACTION_BAR_EXTRA_BOTTOM + Math.max(STICKY_ACTION_BAR_MIN_BOTTOM - insetBottom, 0);
}

/** @deprecated Use getStickyActionBarInnerBottomPadding — kept for callers that read bottomBarPadding. */
export function getStickyActionBarBottomInset(insetBottom: number): number {
  return getStickyActionBarInnerBottomPadding(insetBottom);
}

/** Scroll padding so content clears a sticky action bar at the bottom of the screen. */
export function getStickyActionBarScrollPadding(
  insetBottom: number,
  barBodyHeight = STICKY_ACTION_BAR_BODY_HEIGHT
): number {
  return (
    barBodyHeight +
    insetBottom +
    getStickyActionBarInnerBottomPadding(insetBottom) +
    Layout.scrollBottomExtra
  );
}

export function headerRowStyle(insets: Pick<EdgeInsets, "top">) {
  return { paddingTop: getHeaderPaddingTop(insets.top) };
}
