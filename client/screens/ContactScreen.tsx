import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useSupportTickets } from "@/context/SupportTicketsContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import {
  CONTACT_FORM_BUTTON_SEND_KEY,
  CONTACT_FORM_LABEL_MESSAGE_KEY,
  CONTACT_FORM_LABEL_NAME_KEY,
  CONTACT_FORM_LABEL_SUBJECT_KEY,
  CONTACT_FORM_PLACEHOLDER_MESSAGE_KEY,
  CONTACT_FORM_PLACEHOLDER_NAME_KEY,
  CONTACT_FORM_PLACEHOLDER_SUBJECT_KEY,
  CONTACT_INFO_LABEL_EMAIL_KEY,
  CONTACT_INFO_LABEL_HOURS_KEY,
  CONTACT_INFO_LABEL_PHONE_KEY,
  CONTACT_SECTION_SEND_MESSAGE_KEY,
  CONTACT_SECTION_YOUR_TICKETS_KEY,
  TICKET_SUBMIT_CONFIRMATION_KEY,
  fetchSupportCopyMap,
  formatSupportCopyForDisplay,
  formatSupportCopyLabel,
  getSupportCopyKey,
} from "@/services/content/helpSupportService";

function InfoCard({
  icon,
  label,
  value,
  valueMuted,
  labelMuted,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  valueMuted?: boolean;
  labelMuted?: boolean;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={20} color={Colors.light.accent} />
      </View>
      <View style={styles.infoContent}>
        <ThemedText style={[styles.infoLabel, labelMuted ? styles.infoLabelMuted : undefined]}>{label}</ThemedText>
        <ThemedText style={[styles.infoValue, valueMuted ? styles.infoValueMuted : undefined]}>{value}</ThemedText>
      </View>
    </View>
  );
}

export default function ContactScreen() {
  const { session, profile } = useAuth();
  const {
    ticketViews,
    ticketsLoading,
    ticketsError,
    createTicket,
    refreshTickets,
  } = useSupportTickets();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copyMap, setCopyMap] = useState<Record<string, string> | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const hasLoadedCopy = Boolean(copyMap !== null && !copyLoading && !copyError && isSupabaseConfigured());

  const contactLabel = (key: string) => {
    if (!isSupabaseConfigured()) return "";
    if (copyLoading) return "…";
    return formatSupportCopyLabel(getSupportCopyKey(copyMap, key), { showEmpty: hasLoadedCopy });
  };

  const contactPlaceholder = (key: string) => {
    if (!isSupabaseConfigured() || copyLoading) return "";
    return getSupportCopyKey(copyMap, key);
  };

  const loadContactCopy = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCopyMap(null);
      setCopyLoading(false);
      setCopyError(null);
      return;
    }
    setCopyLoading(true);
    setCopyError(null);
    const res = await fetchSupportCopyMap();
    setCopyLoading(false);
    if (!res.ok) {
      setCopyError(res.error);
      setCopyMap(null);
      return;
    }
    setCopyMap(res.map);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadContactCopy();
    }, [loadContactCopy])
  );

  useEffect(() => {
    if (profile?.full_name && !name) setName(profile.full_name);
  }, [profile?.full_name]);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      setSubmitError("Subject and message are required.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setSubmitError("Sign in with Supabase configured to submit a support ticket.");
      return;
    }

    if (!session?.user) {
      setSubmitError("Sign in to send a support message.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const created = await createTicket({
      subject: subject.trim(),
      body: message.trim(),
      requesterName: name.trim() || profile?.full_name || "User",
      contactEmail: profile?.email ?? session.user.email ?? "",
      category: "Contact",
    });

    if (!created) {
      setSubmitError("Could not submit your message. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubject("");
    setMessage("");
    setConfirmation(true);
    setTimeout(() => setConfirmation(false), 2500);
    setSubmitting(false);
    await refreshTickets();
    await loadContactCopy();
  };

  return (
    <PageLayout title="Contact" titleInHeader header="back" contentContainerStyle={styles.content}>
        {!isSupabaseConfigured() ? (
          <ThemedText style={styles.hintText}>Connect Supabase for live contact details and tickets.</ThemedText>
        ) : null}

        {copyLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.light.accent} />
            <ThemedText style={styles.hintText}>Loading contact info…</ThemedText>
          </View>
        ) : null}

        {copyError ? (
          <Pressable onPress={() => void loadContactCopy()} testID="button-contact-copy-retry">
            <ThemedText style={styles.errorText}>{copyError} — tap to retry</ThemedText>
          </Pressable>
        ) : null}

        <InfoCard
          icon="mail"
          label={contactLabel(CONTACT_INFO_LABEL_EMAIL_KEY)}
          value={formatSupportCopyForDisplay(getSupportCopyKey(copyMap, "support_email"))}
          valueMuted={copyMap !== null && !getSupportCopyKey(copyMap, "support_email")}
          labelMuted={hasLoadedCopy && !getSupportCopyKey(copyMap, CONTACT_INFO_LABEL_EMAIL_KEY)}
        />
        <InfoCard
          icon="phone"
          label={contactLabel(CONTACT_INFO_LABEL_PHONE_KEY)}
          value={formatSupportCopyForDisplay(getSupportCopyKey(copyMap, "support_phone"))}
          valueMuted={copyMap !== null && !getSupportCopyKey(copyMap, "support_phone")}
          labelMuted={hasLoadedCopy && !getSupportCopyKey(copyMap, CONTACT_INFO_LABEL_PHONE_KEY)}
        />
        <InfoCard
          icon="clock"
          label={contactLabel(CONTACT_INFO_LABEL_HOURS_KEY)}
          value={formatSupportCopyForDisplay(getSupportCopyKey(copyMap, "support_hours"))}
          valueMuted={copyMap !== null && !getSupportCopyKey(copyMap, "support_hours")}
          labelMuted={hasLoadedCopy && !getSupportCopyKey(copyMap, CONTACT_INFO_LABEL_HOURS_KEY)}
        />

        {session?.user && isSupabaseConfigured() ? (
          <>
            <ThemedText
              style={[
                styles.sectionTitle,
                hasLoadedCopy && !getSupportCopyKey(copyMap, CONTACT_SECTION_YOUR_TICKETS_KEY)
                  ? styles.sectionTitleMuted
                  : undefined,
              ]}
              testID="text-contact-section-tickets"
            >
              {contactLabel(CONTACT_SECTION_YOUR_TICKETS_KEY)}
            </ThemedText>
            {ticketsLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.light.accent} />
                <ThemedText style={styles.loadingText}>Loading tickets…</ThemedText>
              </View>
            ) : null}
            {ticketsError ? (
              <ThemedText style={styles.errorText}>{ticketsError}</ThemedText>
            ) : null}
            {!ticketsLoading && !ticketsError && ticketViews.length === 0 ? (
              <ThemedText style={styles.hintText}>No tickets yet. Send a message below.</ThemedText>
            ) : null}
            {ticketViews.map((ticket) => (
              <View key={ticket.id} style={styles.ticketRow} testID={`row-ticket-${ticket.id}`}>
                <ThemedText style={styles.ticketSubject} numberOfLines={1}>
                  #{ticket.number} · {ticket.title}
                </ThemedText>
                <ThemedText style={styles.ticketStatus}>{ticket.status}</ThemedText>
              </View>
            ))}
          </>
        ) : null}

        <ThemedText
          style={[
            styles.sectionTitle,
            hasLoadedCopy && !getSupportCopyKey(copyMap, CONTACT_SECTION_SEND_MESSAGE_KEY)
              ? styles.sectionTitleMuted
              : undefined,
          ]}
          testID="text-contact-section-send"
        >
          {contactLabel(CONTACT_SECTION_SEND_MESSAGE_KEY)}
        </ThemedText>

        {!session?.user && isSupabaseConfigured() ? (
          <ThemedText style={styles.errorText}>Sign in to open a support ticket.</ThemedText>
        ) : null}

        <View style={styles.fieldGroup}>
          <ThemedText
            style={[
              styles.label,
              hasLoadedCopy && !getSupportCopyKey(copyMap, CONTACT_FORM_LABEL_NAME_KEY) ? styles.labelMuted : undefined,
            ]}
            testID="label-contact-name"
          >
            {contactLabel(CONTACT_FORM_LABEL_NAME_KEY)}
          </ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={contactPlaceholder(CONTACT_FORM_PLACEHOLDER_NAME_KEY)}
            placeholderTextColor={Colors.light.textSecondary}
            testID="input-contact-name"
            editable={!submitting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText
            style={[
              styles.label,
              hasLoadedCopy && !getSupportCopyKey(copyMap, CONTACT_FORM_LABEL_SUBJECT_KEY)
                ? styles.labelMuted
                : undefined,
            ]}
            testID="label-contact-subject"
          >
            {contactLabel(CONTACT_FORM_LABEL_SUBJECT_KEY)}
          </ThemedText>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder={contactPlaceholder(CONTACT_FORM_PLACEHOLDER_SUBJECT_KEY)}
            placeholderTextColor={Colors.light.textSecondary}
            testID="input-contact-subject"
            editable={!submitting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText
            style={[
              styles.label,
              hasLoadedCopy && !getSupportCopyKey(copyMap, CONTACT_FORM_LABEL_MESSAGE_KEY)
                ? styles.labelMuted
                : undefined,
            ]}
            testID="label-contact-message"
          >
            {contactLabel(CONTACT_FORM_LABEL_MESSAGE_KEY)}
          </ThemedText>
          <TextInput
            style={[styles.input, styles.messageInput]}
            value={message}
            onChangeText={setMessage}
            placeholder={contactPlaceholder(CONTACT_FORM_PLACEHOLDER_MESSAGE_KEY)}
            placeholderTextColor={Colors.light.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            testID="input-contact-message"
            editable={!submitting}
          />
        </View>

        {submitError ? <ThemedText style={styles.errorText}>{submitError}</ThemedText> : null}

        {confirmation ? (
          getSupportCopyKey(copyMap, TICKET_SUBMIT_CONFIRMATION_KEY) ? (
            <ThemedText style={styles.confirmationText} testID="text-message-sent">
              {getSupportCopyKey(copyMap, TICKET_SUBMIT_CONFIRMATION_KEY)}
            </ThemedText>
          ) : (
            <ThemedText style={styles.confirmationMissing} testID="text-message-sent-missing">
              Confirmation text is not set — add it in Admin Support under “After ticket submit”.
            </ThemedText>
          )
        ) : null}

        <Pressable
          style={[styles.sendButton, submitting && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={submitting}
          testID="button-send-message"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText
              style={[
                styles.sendButtonText,
                hasLoadedCopy && !getSupportCopyKey(copyMap, CONTACT_FORM_BUTTON_SEND_KEY)
                  ? styles.sendButtonTextMuted
                  : undefined,
              ]}
              testID="text-contact-send-button"
            >
              {contactLabel(CONTACT_FORM_BUTTON_SEND_KEY)}
            </ThemedText>
          )}
        </Pressable>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: LayoutSpacing.xs,
    gap: 10,
  },
  infoCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  infoLabelMuted: {
    fontStyle: "italic",
    opacity: 0.85,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.light.text,
  },
  infoValueMuted: {
    color: Colors.light.textSecondary,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginLeft: 4,
  },
  sectionTitleMuted: {
    fontStyle: "italic",
    opacity: 0.85,
  },
  fieldGroup: {
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  labelMuted: {
    fontStyle: "italic",
    opacity: 0.85,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.light.text,
  },
  messageInput: {
    minHeight: 120,
    paddingTop: 14,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  hintText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  ticketRow: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  ticketSubject: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
  },
  ticketStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  errorText: {
    fontSize: 14,
    color: "#8B3A3A",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  confirmationText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
    textAlign: "center",
  },
  confirmationMissing: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B8860B",
    textAlign: "center",
  },
  sendButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sendButtonTextMuted: {
    opacity: 0.85,
  },
});
