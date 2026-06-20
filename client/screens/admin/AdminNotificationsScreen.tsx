import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

export default function AdminNotificationsScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const { addBroadcastNotification, logActivity, notifications, configLoading } = usePlatformConfig();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("All Users");
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSendError(null);
    setSending(true);
    const preview = message.trim().substring(0, 80);
    const fullMessage = `${title.trim()}: ${preview}`;
    try {
      await addBroadcastNotification(
        fullMessage,
        targetAudience as "All Users" | "Practitioners" | "Sellers"
      );
      logActivity(`Broadcast sent: ${title.trim()}`, "user");
      setTitle("");
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch {
      setSendError("Could not send notification. Try again.");
    } finally {
      setSending(false);
    }
  };

  const targets = ["All Users", "Practitioners", "Sellers"];
  const configured = isSupabaseConfigured();

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
        <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>
      </View>

      {!configured ? (
        <View style={styles.emptyCard}>
          <ThemedText style={styles.emptyMessage}>
            Connect Supabase to send and persist broadcast notifications.
          </ThemedText>
        </View>
      ) : null}

      <ThemedText style={styles.subSectionTitle}>Send Notification</ThemedText>
      <View style={styles.formCard}>
        <ThemedText style={styles.inputLabel}>Title</ThemedText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Notification title"
          placeholderTextColor={`${Colors.light.textSecondary}80`}
          editable={configured}
          testID="input-notification-title"
        />

        <ThemedText style={styles.inputLabel}>Message</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Write your message..."
          placeholderTextColor={`${Colors.light.textSecondary}80`}
          multiline
          numberOfLines={4}
          editable={configured}
          testID="input-notification-message"
        />

        <ThemedText style={styles.inputLabel}>Target Audience</ThemedText>
        <View style={styles.targetRow}>
          {targets.map((t) => (
            <Pressable
              key={t}
              style={[styles.targetButton, targetAudience === t ? styles.targetButtonActive : null]}
              onPress={() => setTargetAudience(t)}
              disabled={!configured}
              testID={`button-target-${t.toLowerCase().replace(/\s/g, "-")}`}
            >
              <ThemedText
                style={[styles.targetButtonText, targetAudience === t ? styles.targetButtonTextActive : null]}
              >
                {t}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        {configured ? (
          <ThemedText style={styles.audienceNote}>
            All Users sends a broadcast. Practitioners and Sellers create targeted notifications.
          </ThemedText>
        ) : null}

        <Pressable
          style={[styles.sendButton, !configured || sending ? styles.sendButtonDisabled : null]}
          onPress={() => void handleSend()}
          disabled={!configured || sending}
          testID="button-send-notification"
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="send" size={16} color="#FFFFFF" />
              <ThemedText style={styles.sendButtonText}>Send Notification</ThemedText>
            </>
          )}
        </Pressable>

        {sendError ? (
          <ThemedText style={styles.errorText}>{sendError}</ThemedText>
        ) : null}

        {sent ? (
          <View style={styles.confirmationBanner}>
            <Feather name="check-circle" size={16} color="#013220" />
            <ThemedText style={styles.confirmationText}>Notification sent successfully</ThemedText>
          </View>
        ) : null}
      </View>

      <ThemedText style={styles.subSectionTitle}>Sent Broadcasts</ThemedText>
      {configLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.loadingText}>Loading notifications…</ThemedText>
        </View>
      ) : !configured ? null : notifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <ThemedText style={styles.emptyMessage}>
            No broadcast notifications yet. Messages you send will appear here.
          </ThemedText>
        </View>
      ) : (
        notifications.map((notification) => (
          <View key={notification.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle} numberOfLines={2}>
                {notification.message}
              </ThemedText>
              <View style={[styles.statusBadge, styles.statusActive]}>
                <ThemedText style={styles.statusBadgeText}>Sent</ThemedText>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.audienceChip}>
                <Feather name="users" size={10} color={Colors.light.accent} />
                <ThemedText style={styles.audienceChipText}>Broadcast</ThemedText>
              </View>
              <ThemedText style={styles.cardDate}>{notification.time}</ThemedText>
            </View>
          </View>
        ))
      )}

      <ThemedText style={styles.subSectionTitle}>Scheduled</ThemedText>
      <View style={styles.emptyCard}>
        <ThemedText style={styles.emptyMessage}>
          Scheduled notifications are not available yet.
        </ThemedText>
      </View>
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
  formCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  targetRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  audienceNote: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: Spacing.lg,
    lineHeight: 17,
  },
  targetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  targetButtonActive: {
    backgroundColor: Colors.light.accent,
  },
  targetButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  targetButtonTextActive: {
    color: "#FFFFFF",
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    minHeight: 48,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  confirmationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(1, 50, 32, 0.15)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  confirmationText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#013220",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#8B3A3A",
    marginTop: Spacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  emptyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    flex: 1,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
    textAlign: "right",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusActive: {
    backgroundColor: "#013220",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  audienceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${Colors.light.accent}12`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  audienceChipText: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.accent,
  },
});
