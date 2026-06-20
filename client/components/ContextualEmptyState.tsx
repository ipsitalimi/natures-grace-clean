import React, { type ReactNode } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

export default function ContextualEmptyState({
  icon = "inbox",
  title,
  message,
  actionLabel,
  onAction,
  children,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.container} testID="contextual-empty-state">
      <View style={styles.iconWrap}>
        <Feather name={icon} size={28} color={Colors.light.textMuted} />
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>
      {children}
      {actionLabel && onAction ? (
        <Pressable style={styles.actionBtn} onPress={onAction}>
          <ThemedText style={styles.actionText}>{actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.light.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});
