import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import {
  LegalFonts,
  LegalTheme,
  formatLegalLastUpdated,
  getLegalCategoryLabel,
} from "@/constants/legalTheme";
import type { LegalDocumentKey } from "@/types/legal";

interface LegalPageHeroProps {
  docKey: LegalDocumentKey;
  title: string;
  lastUpdated: string;
  version?: string;
  compact?: boolean;
}

export default function LegalPageHero({
  docKey,
  title,
  lastUpdated,
  version,
  compact = false,
}: LegalPageHeroProps) {
  const category = getLegalCategoryLabel(docKey);
  const dateLabel = formatLegalLastUpdated(lastUpdated);

  return (
    <View
      style={[styles.hero, compact && styles.heroCompact]}
      accessibilityRole="header"
    >
      <ThemedText style={styles.category} accessibilityLabel={`Category: ${category}`}>
        {category}
      </ThemedText>
      <ThemedText style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">
        {title}
      </ThemedText>
      <View style={styles.metaRow}>
        <ThemedText style={styles.meta}>Last updated: {dateLabel}</ThemedText>
        {version ? (
          <ThemedText style={styles.versionMeta} accessibilityLabel={`Version ${version}`}>
            · {version}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "flex-start",
    marginBottom: LegalTheme.heroBottomGap,
    paddingTop: 8,
  },
  heroCompact: {
    marginBottom: 32,
    paddingTop: 0,
  },
  category: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 4,
    textTransform: "uppercase",
    color: LegalTheme.sageLabel,
    fontFamily: LegalFonts.sansMedium,
    marginBottom: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: "300",
    lineHeight: 48,
    color: LegalTheme.headingText,
    fontFamily: LegalFonts.serif,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: LegalTheme.metaText,
    fontFamily: LegalFonts.sans,
  },
  versionMeta: {
    fontSize: 13,
    lineHeight: 20,
    color: LegalTheme.metaText,
    fontFamily: LegalFonts.sans,
    opacity: 0.75,
  },
});
