import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";

type ParamList = {
  EventRegistration: { eventId: string };
};

export default function EventRegistrationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, "EventRegistration">>();
  const { eventId } = route.params;
  const { events } = useDataContext();
  const event = events.find((e) => e.id === eventId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isValid = name.trim().length > 0 && email.trim().length > 0 && phone.trim().length > 0;

  const handleSubmit = () => {
    if (isValid) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter} />
          <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
            <Feather name="bell" size={22} color={Colors.light.accent} />
          </Pressable>
        </View>
        <View style={styles.confirmationContainer}>
          <View style={styles.confirmationIcon}>
            <Feather name="check-circle" size={56} color={Colors.light.accent} />
          </View>
          <ThemedText style={styles.confirmationTitle}>
            You're Registered
          </ThemedText>
          <ThemedText style={styles.confirmationSubtitle}>
            {event ? `Thank you for registering for ${event.title}. We'll be in touch with more details soon.` : "Your registration has been received."}
          </ThemedText>
          <Pressable
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
            testID="button-done"
          >
            <ThemedText style={styles.doneButtonText}>Done</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
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
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {event ? (
          <ThemedText style={styles.subtitle}>{event.title}</ThemedText>
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
          />
        </View>

        <Pressable
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid}
          testID="button-submit-registration"
        >
          <ThemedText style={styles.submitButtonText}>
            {event?.ctaText === "Join Event" ? "Confirm Registration" : "Register Interest"}
          </ThemedText>
        </Pressable>

        {event ? (
          <ThemedText style={styles.noteText}>{event.bottomNote}</ThemedText>
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
    marginBottom: Spacing.lg,
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
});
