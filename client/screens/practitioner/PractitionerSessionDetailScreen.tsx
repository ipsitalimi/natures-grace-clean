import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Pressable, Alert, TextInput } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { openMeetingLink } from "@/lib/meetingLink";

export default function PractitionerSessionDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const sessionId = route.params?.sessionId;
  const { sessions, completeSession, cancelSession } = usePractitionerContext();
  const { scrollPaddingBottom } = useLayoutInsets(16);
  const session = sessions.find((s) => s.id === sessionId);
  const [sessionNotes, setSessionNotes] = useState(session?.notes ?? "");

  useEffect(() => {
    setSessionNotes(session?.notes ?? "");
  }, [session?.id, session?.notes]);
  const [actionDone, setActionDone] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleJoinSession = () => {
    if (!session) return;
    openMeetingLink(session.meetingLink);
  };

  const runAction = async (action: "complete" | "cancel") => {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    setActionError("");
    setActionDone("");

    const notes = sessionNotes.trim() || undefined;
    const updated =
      action === "complete"
        ? await completeSession(sessionId, notes)
        : await cancelSession(sessionId, notes);

    setSubmitting(false);

    if (!updated) {
      setActionError("Could not update this session. Please try again.");
      return;
    }

    const label = action === "complete" ? "Marked as Completed" : "Session Cancelled";
    setActionDone(label);
    setTimeout(() => setActionDone(""), 2500);
  };

  const handleAction = (action: "complete" | "cancel") => {
    if (action === "cancel") {
      Alert.alert(
        "Cancel session?",
        "The client will be notified. This cannot be undone.",
        [
          { text: "Keep session", style: "cancel" },
          { text: "Cancel session", style: "destructive", onPress: () => void runAction("cancel") },
        ]
      );
      return;
    }
    void runAction("complete");
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <BackHeader showNotifications={false} />
        <BelowHeaderTitle>Session Details</BelowHeaderTitle>
        <View style={styles.notFound}>
          <ThemedText style={styles.emptyText}>Session not found</ThemedText>
          <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
            <ThemedText style={styles.backLinkText}>Go back</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackHeader showNotifications={false} />
      <BelowHeaderTitle>Session Details</BelowHeaderTitle>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
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

          <View style={styles.notesSection}>
            <ThemedText style={styles.notesLabel}>Session notes</ThemedText>
            {session.status === "Upcoming" ? (
              <TextInput
                style={styles.notesInput}
                placeholder="Private notes for this session (optional)"
                placeholderTextColor={Colors.light.textMuted}
                value={sessionNotes}
                onChangeText={setSessionNotes}
                multiline
                textAlignVertical="top"
              />
            ) : session.notes ? (
              <ThemedText style={styles.notesText}>{session.notes}</ThemedText>
            ) : (
              <ThemedText style={styles.notesPlaceholder}>No notes for this session</ThemedText>
            )}
          </View>
        </View>

        {session.status === "Upcoming" ? (
          <View style={styles.actionButtons}>
            <Pressable
              style={styles.joinButton}
              onPress={handleJoinSession}
              testID="button-join-session"
            >
              <Feather name="video" size={16} color="#FFFFFF" />
              <ThemedText style={styles.joinButtonText}>Join Session</ThemedText>
            </Pressable>
            <View style={styles.secondaryButtonsRow}>
              <Pressable
                style={[styles.completeButton, submitting && styles.buttonDisabled]}
                onPress={() => handleAction("complete")}
                disabled={submitting}
                testID="button-mark-completed"
              >
                <Feather name="check-circle" size={16} color={Colors.light.accent} />
                <ThemedText style={styles.completeButtonText}>Mark Completed</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.cancelButton, submitting && styles.buttonDisabled]}
                onPress={() => handleAction("cancel")}
                disabled={submitting}
                testID="button-cancel-session"
              >
                <Feather name="x-circle" size={16} color="#8B3A3A" />
                <ThemedText style={styles.cancelButtonText}>Cancel Session</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {actionError ? <ThemedText style={styles.errorText}>{actionError}</ThemedText> : null}

        {actionDone ? (
          <View style={styles.confirmationBanner}>
            <Feather name="check-circle" size={16} color="#013220" />
            <ThemedText style={styles.confirmationText}>{actionDone}</ThemedText>
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.textMuted,
    textAlign: "center",
  },
  backLink: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.cardBackground,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
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
  avatarInfo: { flex: 1 },
  clientName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  serviceLabel: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  detailsGrid: { gap: Spacing.lg },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
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
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  notesInput: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
    minHeight: 88,
  },
  notesText: {
    fontSize: 14,
    color: Colors.light.textMuted,
    lineHeight: 20,
  },
  notesPlaceholder: {
    fontSize: 14,
    color: Colors.light.textMuted,
    fontStyle: "italic",
  },
  actionButtons: { gap: Spacing.md },
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
    fontWeight: "700",
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
    fontWeight: "700",
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
    fontWeight: "700",
    color: "#8B3A3A",
  },
  buttonDisabled: { opacity: 0.6 },
  errorText: {
    fontSize: 14,
    color: "#C0392B",
    textAlign: "center",
    marginTop: Spacing.md,
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
    fontWeight: "700",
    color: "#013220",
  },
});
