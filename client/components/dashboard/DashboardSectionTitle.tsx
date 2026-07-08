import React from "react";
import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";
import { LayoutSpacing } from "@/constants/layout";

type DashboardSectionTitleProps = {
  children: string;
  style?: "eyebrow" | "heading";
};

export default function DashboardSectionTitle({
  children,
  style = "heading",
}: DashboardSectionTitleProps) {
  return (
    <ThemedText style={style === "eyebrow" ? styles.eyebrow : styles.heading}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    marginBottom: LayoutSpacing.sm,
    marginTop: LayoutSpacing.xs,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: LayoutSpacing.sm,
    marginTop: LayoutSpacing.xs,
  },
});
