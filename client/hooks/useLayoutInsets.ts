import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getAuthScreenPaddingTop,
  getHeaderPaddingTop,
  getScrollBottomPadding,
  LAYOUT,
} from "@/lib/layoutInsets";

/**
 * Standard safe-area metrics for screens, headers, and scroll areas.
 * Use this instead of reading raw insets and adding magic numbers.
 */
export function useLayoutInsets(footerExtra = 0) {
  const insets = useSafeAreaInsets();

  return {
    insets,
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
    horizontal: LAYOUT.screenHorizontal,
    headerPaddingTop: getHeaderPaddingTop(insets.top),
    authPaddingTop: getAuthScreenPaddingTop(insets.top),
    scrollPaddingBottom: getScrollBottomPadding(insets.bottom, footerExtra),
    headerRowStyle: { paddingTop: getHeaderPaddingTop(insets.top) },
  };
}
