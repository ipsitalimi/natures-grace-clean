import React from "react";
import { StyleSheet, type TextStyle, type StyleProp } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { PageSubtitleStyle, Layout } from "@/constants/layout";

type PageSubtitleProps = {
  children: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

export default function PageSubtitle({ children, style, testID }: PageSubtitleProps) {
  return (
    <ThemedText
      style={[styles.subtitle, style]}
      numberOfLines={3}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      maxFontSizeMultiplier={1.3}
      testID={testID ?? "page-subtitle"}
    >
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    ...PageSubtitleStyle,
    paddingHorizontal: Layout.gutter,
  },
});
