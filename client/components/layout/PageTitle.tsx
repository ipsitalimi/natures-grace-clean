import React from "react";
import { StyleSheet, type TextStyle, type StyleProp } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { PageTitleStyle, Layout } from "@/constants/layout";

type PageTitleProps = {
  children: string;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

/** Center-aligned serif page title — shared across User, Practitioner, Seller, Admin. */
export default function PageTitle({ children, muted, style, testID }: PageTitleProps) {
  return (
    <ThemedText
      style={[styles.title, muted && styles.muted, style]}
      numberOfLines={2}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      maxFontSizeMultiplier={1.3}
      testID={testID ?? "page-title"}
    >
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  title: {
    ...PageTitleStyle,
    width: "100%",
    flexShrink: 1,
    paddingHorizontal: Layout.gutter,
  },
  muted: {
    fontStyle: "italic",
    opacity: 0.65,
  },
});
