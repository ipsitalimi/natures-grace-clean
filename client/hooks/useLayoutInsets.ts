import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Layout } from "@/constants/layout";
import {
  getAuthScreenPaddingTop,
  getCompactHeaderPaddingTop,
  getHeaderPaddingTop,
  getScrollBottomPadding,
  getStickyActionBarBottomInset,
  getStickyActionBarScrollPadding,
  STICKY_ACTION_BAR_BODY_HEIGHT,
} from "@/lib/layoutInsets";

/**
 * Standard safe-area metrics for screens, headers, and scroll areas.
 * Prefer PageLayout + ScreenHeader instead of reading raw insets in screens.
 */
export function useLayoutInsets(footerExtra = 0) {
  const insets = useSafeAreaInsets();

  return {
    insets,
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
    gutter: Layout.gutter,
    horizontal: Layout.gutter,
    headerPaddingTop: getHeaderPaddingTop(insets.top),
    headerPaddingTopCompact: getCompactHeaderPaddingTop(insets.top),
    authPaddingTop: getAuthScreenPaddingTop(insets.top),
    scrollPaddingBottom: getScrollBottomPadding(insets.bottom, footerExtra),
    headerRowStyle: { paddingTop: getHeaderPaddingTop(insets.top) },
  };
}

/** Consistent insets for screens with a sticky primary button at the bottom. */
export function useStickyActionBarInsets(barBodyHeight = STICKY_ACTION_BAR_BODY_HEIGHT) {
  const insets = useSafeAreaInsets();
  const innerBottom = getStickyActionBarBottomInset(insets.bottom);

  return {
    scrollPaddingBottom: getStickyActionBarScrollPadding(insets.bottom, barBodyHeight),
    bottomBarPadding: innerBottom,
    bottom: insets.bottom,
    /** Distance from screen bottom to top of the sticky button row (for toasts, etc.). */
    stickyBarOffset: insets.bottom + innerBottom + barBodyHeight,
  };
}
