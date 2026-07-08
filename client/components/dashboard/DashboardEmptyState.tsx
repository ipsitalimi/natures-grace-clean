import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";
import { LayoutSpacing } from "@/constants/layout";

type DashboardEmptyStateProps = {
  icon: keyof typeof Feather.glyphMap;
  message: string;
};

export default function DashboardEmptyState({ icon, message }: DashboardEmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Feather name={icon} size={22} color={Colors.light.accent} />
      </View>
      <ThemedText style={styles.message}>{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: LayoutSpacing.lg,
    paddingHorizontal: LayoutSpacing.md,
    gap: LayoutSpacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textMuted,
    textAlign: "center",
  },
});
