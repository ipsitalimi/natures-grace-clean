import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { BelowHeaderTitleStyle, Layout, LayoutSpacing } from "@/constants/layout";

type BelowHeaderTitleProps = {
  children: string;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Centered serif title below the header row — used on stack screens that keep
 * the title out of the header bar. Preserves the legacy 34px look with text safety.
 */
export default function BelowHeaderTitle({ children, style, testID }: BelowHeaderTitleProps) {
  return (
    <View style={[styles.wrap, style]} testID={testID}>
      <ThemedText
        style={styles.title}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.3}
        testID={testID ? `${testID}-text` : "below-header-title"}
      >
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: Layout.gutter,
    marginBottom: LayoutSpacing.md,
  },
  title: {
    ...BelowHeaderTitleStyle,
  },
});
