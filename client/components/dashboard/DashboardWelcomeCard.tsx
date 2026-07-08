import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";
import { CardTokens, LayoutSpacing } from "@/constants/layout";
import { Shadows } from "@/constants/theme";

const cardShadow = {
  borderRadius: CardTokens.radius,
  ...Shadows.soft,
};

type DashboardWelcomeCardProps = {
  greeting: string;
  title?: string;
  subtitle: string;
  meta?: string;
  testID?: string;
};

export default function DashboardWelcomeCard({
  greeting,
  title,
  subtitle,
  meta,
  testID,
}: DashboardWelcomeCardProps) {
  return (
    <View style={styles.card} testID={testID}>
      <ThemedText style={styles.greeting}>{greeting}</ThemedText>
      {title ? <ThemedText style={styles.title}>{title}</ThemedText> : null}
      <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
      {meta ? <ThemedText style={styles.meta}>{meta}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.cardBackground,
    paddingVertical: LayoutSpacing.md,
    paddingHorizontal: LayoutSpacing.md,
    marginBottom: LayoutSpacing.md,
    ...cardShadow,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textMuted,
    textTransform: "capitalize",
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "ui-serif",
    color: Colors.light.accent,
    marginBottom: LayoutSpacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
  },
  meta: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.light.textMuted,
    marginTop: LayoutSpacing.sm,
  },
});
