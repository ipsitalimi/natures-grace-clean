import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";

import { Colors } from "@/constants/theme";
import { CardTokens, LayoutSpacing } from "@/constants/layout";
import { Shadows } from "@/constants/theme";

const cardShadow = {
  borderRadius: CardTokens.radius,
  ...Shadows.soft,
};

type DashboardPanelProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
};

/** Light card shell for dashboard sections (sessions, activity, etc.). */
export default function DashboardPanel({ children, style, testID }: DashboardPanelProps) {
  return (
    <View style={[styles.panel, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.light.cardBackground,
    marginBottom: LayoutSpacing.md,
    overflow: "hidden",
    ...cardShadow,
  },
});
