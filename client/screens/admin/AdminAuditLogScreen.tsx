import React, { useCallback } from "react";
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { usePlatformConfig } from "@/context/PlatformConfigContext";

export default function AdminAuditLogScreen({
  onBackToDashboard,
}: {
  onBackToDashboard: () => void;
}) {
  const { activityLog, activityLogLoading, activityLogError, refreshActivityLog } =
    usePlatformConfig();

  useFocusEffect(
    useCallback(() => {
      void refreshActivityLog();
    }, [refreshActivityLog])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard}>
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Audit Log</ThemedText>
      </View>

      <ThemedText style={styles.hint}>
        Major admin actions including approvals, suspensions, featured content, and settings changes.
      </ThemedText>

      {activityLogLoading ? (
        <ActivityIndicator color={Colors.light.accent} style={{ marginTop: 40 }} />
      ) : activityLogError ? (
        <Pressable onPress={() => void refreshActivityLog()}>
          <ThemedText style={styles.errorText}>{activityLogError} — tap to retry</ThemedText>
        </Pressable>
      ) : activityLog.length === 0 ? (
        <ThemedText style={styles.emptyText}>No admin actions recorded yet.</ThemedText>
      ) : (
        activityLog.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <ThemedText style={styles.cardDesc}>{entry.description}</ThemedText>
            <ThemedText style={styles.cardMeta}>
              {entry.actorName ? `${entry.actorName} · ` : ""}
              {entry.timeAgo}
              {entry.targetType && entry.targetId
                ? ` · ${entry.targetType}:${entry.targetId.slice(0, 8)}`
                : ""}
            </ThemedText>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.md },
  backButton: { padding: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: Colors.light.text },
  hint: { fontSize: 13, color: Colors.light.textMuted, marginBottom: Spacing.lg, lineHeight: 18 },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  cardDesc: { fontSize: 14, color: Colors.light.text, lineHeight: 20 },
  cardMeta: { fontSize: 11, color: Colors.light.textMuted, marginTop: 6 },
  emptyText: { textAlign: "center", color: Colors.light.textMuted, marginTop: 40 },
  errorText: { color: "#8B3A3A", textAlign: "center", marginTop: 40 },
});
