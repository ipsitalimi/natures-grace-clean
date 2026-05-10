import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { practitionerSessions } from "@/data/practitionerMockData";

export default function PractitionerSessionDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const sessionId = route.params?.sessionId;
  const session = practitionerSessions.find((s) => s.id === sessionId);
  const [actionDone, setActionDone] = useState("");

  const handleAction = (action: string) => {
    setActionDone(action);
    setTimeout(() => setActionDone(""), 2500);
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.emptyText}>Session not found</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={20} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Session Details</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Feather name="user" size={28} color={Colors.light.accent} />
            </View>
            <View style={styles.avatarInfo}>
              <ThemedText style={styles.clientName}>{session.userName}</ThemedText>
              <ThemedText style={styles.serviceLabel}>{session.service}</ThemedText>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Feather name="calendar" size={16} color={Colors.light.textMuted} />
              <View>
                <ThemedText style={styles.detailLabel}>Date</ThemedText>
                <ThemedText style={styles.detailValue}>{session.date}</ThemedText>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Feather name="clock" size={16} color={Colors.light.textMuted} />
              <View>
                <ThemedText style={styles.detailLabel}>Time</ThemedText>
                <ThemedText style={styles.detailValue}>{session.time}</ThemedText>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Feather name="activity" size={16} color={Colors.light.textMuted} />
              <View>
                <ThemedText style={styles.detailLabel}>Duration</ThemedText>
                <ThemedText style={styles.detailValue}>{session.duration}</ThemedText>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Feather name="info" size={16} color={Colors.light.textMuted} />
              <View>
                <ThemedText style={styles.detailLabel}>Status</ThemedText>
                <ThemedText style={styles.detailValue}>{session.status}</ThemedText>
              </View>
            </View>
          </View>

          {session.notes ? (
            <View style={styles.notesSection}>
              <ThemedText style={styles.notesLabel}>Notes</ThemedText>
              <ThemedText style={styles.notesText}>{session.notes}</ThemedText>
            </View>
          ) : (
            <View style={styles.notesSection}>
              <ThemedText style={styles.notesLabel}>Notes</ThemedText>
              <ThemedText style={styles.notesPlaceholder}>No notes for this session</ThemedText>
            </View>
          )}
        </View>

        {session.status === "Upcoming" ? (
          <View style={styles.actionButtons}>
            <Pressable
              style={styles.joinButton}
              onPress={() => handleAction("Joined")}
              testID="button-join-session"
            >
              <Feather name="video" size={16} color="#FFFFFF" />
              <ThemedText style={styles.joinButtonText}>Join Session</ThemedText>
            </Pressable>
            <View style={styles.secondaryButtonsRow}>
              <Pressable
                style={styles.completeButton}
                onPress={() => handleAction("Marked as Completed")}
                testID="button-mark-completed"
              >
                <Feather name="check-circle" size={16} color={Colors.light.accent} />
                <ThemedText style={styles.completeButtonText}>Mark Completed</ThemedText>
              </Pressable>
              <Pressable
                style={styles.cancelButton}
                onPress={() => handleAction("Session Cancelled")}
                testID="button-cancel-session"
              >
                <Feather name="x-circle" size={16} color="#8B3A3A" />
                <ThemedText style={styles.cancelButtonText}>Cancel Session</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {actionDone ? (
          <View style={styles.confirmationBanner}>
            <Feather name="check-circle" size={16} color="#013220" />
            <ThemedText style={styles.confirmationText}>{actionDone}</ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  avatarInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  serviceLabel: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  detailsGrid: {
    gap: Spacing.lg,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  notesSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    lineHeight: 20,
  },
  notesPlaceholder: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    fontStyle: "italic",
  },
  actionButtons: {
    gap: Spacing.md,
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  secondaryButtonsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  completeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  completeButtonText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#8B3A3A",
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  cancelButtonText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#8B3A3A",
  },
  confirmationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(1, 50, 32, 0.1)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  confirmationText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#013220",
  },
});
