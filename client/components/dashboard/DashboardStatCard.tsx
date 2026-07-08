import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";
import { CardTokens, LayoutSpacing } from "@/constants/layout";
import { Shadows } from "@/constants/theme";

const cardShadow = {
  borderRadius: CardTokens.radius,
  ...Shadows.soft,
};

type DashboardStatCardProps = {
  icon: keyof typeof Feather.glyphMap;
  value: string | number;
  label: string;
  status: string;
  onPress?: () => void;
  testID?: string;
};

export default function DashboardStatCard({
  icon,
  value,
  label,
  status,
  onPress,
  testID,
}: DashboardStatCardProps) {
  const content = (
    <>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Feather name={icon} size={16} color={Colors.light.accent} />
        </View>
        <ThemedText style={styles.value}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </ThemedText>
      </View>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText style={styles.status} numberOfLines={1}>
        {status}
      </ThemedText>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.card} onPress={onPress} testID={testID}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.card} testID={testID}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "47.5%",
    flexGrow: 1,
    backgroundColor: Colors.light.cardBackground,
    padding: LayoutSpacing.sm,
    minHeight: 88,
    ...cardShadow,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: LayoutSpacing.xs,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    lineHeight: 26,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  status: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
});
