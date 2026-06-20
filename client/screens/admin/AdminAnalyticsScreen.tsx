import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

function EmptySection({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.emptySection}>
      <ThemedText style={styles.emptySectionTitle}>{title}</ThemedText>
      <ThemedText style={styles.emptySectionMessage}>{message}</ThemedText>
    </View>
  );
}

export default function AdminAnalyticsScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const configured = isSupabaseConfigured();
  const emptyMessage = configured
    ? "No analytics data is available yet. Metrics will appear here once reporting is connected."
    : "Connect Supabase to load platform analytics.";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard} testID="button-back-dashboard">
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Analytics</ThemedText>
      </View>

      <View style={styles.emptyCard}>
        <Feather name="bar-chart-2" size={28} color={Colors.light.textMuted} />
        <ThemedText style={styles.emptyTitle}>No analytics to display</ThemedText>
        <ThemedText style={styles.emptyMessage}>{emptyMessage}</ThemedText>
      </View>

      <ThemedText style={styles.subSectionTitle}>Overview</ThemedText>
      <EmptySection title="User metrics" message={emptyMessage} />

      <ThemedText style={styles.subSectionTitle}>Engagement Trends</ThemedText>
      <EmptySection title="Weekly engagement" message={emptyMessage} />

      <ThemedText style={styles.subSectionTitle}>Popular Categories</ThemedText>
      <EmptySection title="Category breakdown" message={emptyMessage} />

      <ThemedText style={styles.subSectionTitle}>Mood Trends</ThemedText>
      <EmptySection title="Mood distribution" message={emptyMessage} />

      <ThemedText style={styles.subSectionTitle}>Revenue Summary</ThemedText>
      <EmptySection title="Revenue" message={emptyMessage} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  emptyMessage: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
  emptySection: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  emptySectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textSecondary,
  },
  emptySectionMessage: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    lineHeight: 18,
  },
});
