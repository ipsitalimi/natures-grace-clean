import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/constants/theme";
import { getStickyActionBarInnerBottomPadding } from "@/lib/layoutInsets";

type StickyActionBarProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function StickyActionBar({ children, style }: StickyActionBarProps) {
  const insets = useSafeAreaInsets();
  const innerBottomPadding = getStickyActionBarInnerBottomPadding(insets.bottom);

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.wrapper, style]}>
      <View style={[styles.bar, { paddingBottom: innerBottomPadding }]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundRoot,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  bar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
});
