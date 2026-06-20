import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  ScrollViewProps,
  StyleProp,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { Colors } from "@/constants/theme";

type ScreenLayoutProps = {
  children: React.ReactNode;
  /** Wrap body in ScrollView with standard bottom safe padding. */
  scrollable?: boolean;
  /** Apply top safe-area on root (use when screen has no AppHeader / ScreenHeaderBar). */
  safeTop?: boolean;
  /** Apply bottom safe-area on root. Default true. */
  safeBottom?: boolean;
  /** Renders above scroll/body (not inside safe top — header should include safe top itself). */
  header?: React.ReactNode;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle" | "children">;
  /** Added to scroll bottom padding (e.g. tab bar height from useBottomTabBarHeight). */
  footerInset?: number;
};

/**
 * Standard screen shell: flex root, optional safe edges, optional header, scroll or static body.
 */
export default function ScreenLayout({
  children,
  scrollable = false,
  safeTop = false,
  safeBottom = true,
  header,
  backgroundColor = Colors.light.backgroundRoot,
  style,
  contentContainerStyle,
  scrollViewProps,
  footerInset = 0,
}: ScreenLayoutProps) {
  const { scrollPaddingBottom } = useLayoutInsets(footerInset);

  const edges: Edge[] = [];
  if (safeTop) edges.push("top");
  if (safeBottom) edges.push("bottom");

  const body = scrollable ? (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[contentContainerStyle, { paddingBottom: scrollPaddingBottom }]}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, contentContainerStyle]}>{children}</View>
  );

  const inner = (
    <View style={[styles.root, { backgroundColor }, style]}>
      {header}
      {body}
    </View>
  );

  if (edges.length === 0) {
    return inner;
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor }]} edges={edges}>
      {header}
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
