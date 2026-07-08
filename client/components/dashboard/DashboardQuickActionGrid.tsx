import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";
import { CardTokens, LayoutSpacing } from "@/constants/layout";
import { Shadows } from "@/constants/theme";

const cardShadow = Shadows.soft;

export type DashboardQuickAction = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
};

type DashboardQuickActionGridProps = {
  actions: DashboardQuickAction[];
  columns?: 2 | 3;
};

export default function DashboardQuickActionGrid({
  actions,
  columns = 3,
}: DashboardQuickActionGridProps) {
  const rows: DashboardQuickAction[][] = [];
  for (let i = 0; i < actions.length; i += columns) {
    rows.push(actions.slice(i, i + columns));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={action.onPress}
              testID={action.testID}
            >
              <View style={styles.iconWrap}>
                <Feather name={action.icon} size={18} color={Colors.light.accent} />
              </View>
              <ThemedText style={styles.label} numberOfLines={2}>
                {action.label}
              </ThemedText>
            </Pressable>
          ))}
          {row.length < columns
            ? Array.from({ length: columns - row.length }).map((_, i) => (
                <View key={`spacer-${rowIndex}-${i}`} style={styles.cardSpacer} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: LayoutSpacing.xs,
    marginBottom: LayoutSpacing.md,
  },
  row: {
    flexDirection: "row",
    gap: LayoutSpacing.xs,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: CardTokens.radius,
    paddingVertical: LayoutSpacing.md,
    paddingHorizontal: LayoutSpacing.xs,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 84,
    ...cardShadow,
  },
  cardSpacer: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: LayoutSpacing.sm,
  },
  label: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    textAlign: "center",
    lineHeight: 16,
  },
});
