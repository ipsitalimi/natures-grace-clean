import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useEventRegistrations } from "@/context/EventRegistrationsContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import { eventRegistrationNote } from "@/lib/eventPricing";

type ParamList = {
  EventRegistration: { eventId: string };
};

export default function EventRegistrationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, "EventRegistration">>();
  const { eventId } = route.params;
  const { events } = useDataContext();
  const { session, profile } = useAuth();
  const {
    registrationsLoading,
    registrationsError,
    registerForEvent,
    cancelRegistration,
    getMyRegistrationForEvent,
    refreshRegistrations,
  } = useEventRegistrations();
  const event = events.find((e) => e.id === eventId);
  const eventDbId = event?.dbId;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const existingRegistration = eventDbId
    ? getMyRegistrationForEvent(eventDbId)
    : undefined;

  useEffect(() => {
    if (profile?.full_name && !name) setName(profile.full_name);
    if (profile?.email && !email) setEmail(profile.email);
    if (profile?.phone && !phone) setPhone(profile.phone ?? "");
  }, [profile?.full_name, profile?.email, profile?.phone]);

  useEffect(() => {
    if (existingRegistration) {
      setName(existingRegistration.attendeeName);
      setEmail(existingRegistration.attendeeEmail);
      setPhone(existingRegistration.attendeePhone);
      setMessage(existingRegistration.message);
    }
  }, [existingRegistration?.id]);

  const isValid = name.trim().length > 0 && email.trim().length > 0 && phone.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;

    if (!isSupabaseConfigured()) {
      setSubmitError("Sign in and connect Supabase to register for events.");
      return;
    }
    if (!session?.user) {
      setSubmitError("Sign in to register for this event.");
      return;
    }
    if (!eventDbId) {
      setSubmitError("This event is not synced yet. Try again after content loads.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await registerForEvent({
        eventDbId,
        attendeeName: name,
        attendeeEmail: email,
        attendeePhone: phone,
        message,
      });
      if (!created) {
        setSubmitError("Registration could not be saved. Please try again.");
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Registration could not be saved."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!existingRegistration || cancelling) return;
    setCancelling(true);
    setSubmitError(null);
    const ok = await cancelRegistration(existingRegistration.id);
    if (!ok) {
      setSubmitError("Could not cancel registration. Please try again.");
    } else {
      await refreshRegistrations();
    }
    setCancelling(false);
  };

  const showConfirmation = Boolean(existingRegistration);

  if (showConfirmation) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter} />
          <Pressable
            style={styles.headerIconButton}
            onPress={() => navigation.navigate("Notifications" as never)}
            testID="button-notifications"
          >
            <Feather name="bell" size={22} color={Colors.light.accent} />
          </Pressable>
        </View>
        <View style={styles.confirmationContainer}>
          <View style={styles.confirmationIcon}>
            <Feather name="check-circle" size={56} color={Colors.light.accent} />
          </View>
          <ThemedText style={styles.confirmationTitle}>You&apos;re Registered</ThemedText>
          <ThemedText style={styles.confirmationSubtitle}>
            {event
              ? `Thank you for registering for ${event.title}. We'll be in touch with more details soon.`
              : "Your registration has been received."}
          </ThemedText>
          {submitError ? (
            <ThemedText style={styles.errorText}>{submitError}</ThemedText>
          ) : null}
          <Pressable
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
            testID="button-done"
          >
            <ThemedText style={styles.doneButtonText}>Done</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.cancelLink, cancelling && styles.submitButtonDisabled]}
            onPress={handleCancel}
            disabled={cancelling}
            testID="button-cancel-registration"
          >
            {cancelling ? (
              <ActivityIndicator color={Colors.light.accent} />
            ) : (
              <ThemedText style={styles.cancelLinkText}>Cancel registration</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable
          style={styles.headerIconButton}
          onPress={() => navigation.navigate("Notifications" as never)}
          testID="button-notifications"
        >
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Register</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getScrollBottomPadding(insets.bottom) + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!event ? (
          <ThemedText style={styles.errorText}>Event not found.</ThemedText>
        ) : null}

        {registrationsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.light.accent} />
            <ThemedText style={styles.loadingText}>Loading registration…</ThemedText>
          </View>
        ) : null}

        {registrationsError ? (
          <ThemedText style={styles.errorText}>{registrationsError}</ThemedText>
        ) : null}

        {!session?.user && isSupabaseConfigured() ? (
          <ThemedText style={styles.errorText}>Sign in to register for this event.</ThemedText>
        ) : null}

        {event && !eventDbId && isSupabaseConfigured() ? (
          <ThemedText style={styles.errorText}>
            This event is still loading. Pull to refresh community events and try again.
          </ThemedText>
        ) : null}

        {event ? (
          <ThemedText style={styles.subtitle}>{event.title}</ThemedText>
        ) : null}

        {event ? (
          <View style={styles.registrationNote}>
            <Feather name="info" size={16} color={Colors.light.accent} />
            <ThemedText style={styles.registrationNoteText}>
              {eventRegistrationNote(event.pricing)}
            </ThemedText>
          </View>
        ) : null}

        {event ? (
          <View style={styles.eventInfoCard}>
            <View style={styles.eventInfoRow}>
              <Feather name="calendar" size={16} color={Colors.light.accent} />
              <ThemedText style={styles.eventInfoText}>{event.date}</ThemedText>
            </View>
            <View style={styles.eventInfoRow}>
              <Feather name="clock" size={16} color={Colors.light.accent} />
              <ThemedText style={styles.eventInfoText}>{event.time}</ThemedText>
            </View>
          </View>
        ) : null}

        <View style={styles.formSection}>
          <ThemedText style={styles.label}>Full Name *</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor={Colors.light.textSecondary}
            testID="input-name"
            editable={!registrationsLoading && !submitting}
          />

          <ThemedText style={styles.label}>Email *</ThemedText>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor={Colors.light.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="input-email"
            editable={!registrationsLoading && !submitting}
          />

          <ThemedText style={styles.label}>Phone Number *</ThemedText>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            placeholderTextColor={Colors.light.textSecondary}
            keyboardType="phone-pad"
            testID="input-phone"
            editable={!registrationsLoading && !submitting}
          />

          <ThemedText style={styles.label}>Message (Optional)</ThemedText>
          <TextInput
            style={[styles.input, styles.messageInput]}
            value={message}
            onChangeText={setMessage}
            placeholder="Any questions or notes for us"
            placeholderTextColor={Colors.light.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            testID="input-message"
            editable={!registrationsLoading && !submitting}
          />
        </View>

        {submitError ? <ThemedText style={styles.errorText}>{submitError}</ThemedText> : null}

        <Pressable
          style={[
            styles.submitButton,
            (!isValid || submitting || registrationsLoading || !eventDbId) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isValid || submitting || registrationsLoading || !eventDbId}
          testID="button-submit-registration"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.submitButtonText}>
              {event?.ctaText === "Join Event" ? "Confirm Registration" : "Register Interest"}
            </ThemedText>
          )}
        </Pressable>

        {event ? <ThemedText style={styles.noteText}>{event.bottomNote}</ThemedText> : null}
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
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 8,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerIconButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  registrationNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  registrationNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.text,
  },
  eventInfoCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: 8,
  },
  eventInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  eventInfoText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  messageInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  noteText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: "#8B3A3A",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  confirmationIcon: {
    marginBottom: Spacing.lg,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    marginBottom: Spacing.md,
  },
  confirmationSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  doneButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cancelLink: {
    marginTop: Spacing.lg,
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontSize: 14,
    color: Colors.light.accent,
    fontWeight: "500",
  },
});
