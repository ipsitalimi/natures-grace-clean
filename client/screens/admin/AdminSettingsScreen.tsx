import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useAppBrandCopy } from "@/hooks/useAppBrandCopy";

function ToggleRow({
  label,
  value,
  onToggle,
  testID,
  disabled,
  plannedHint,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  testID: string;
  disabled?: boolean;
  plannedHint?: string;
}) {
  return (
    <View style={styles.toggleBlock}>
      <View style={styles.toggleRow}>
        <ThemedText style={[styles.toggleLabel, disabled ? styles.toggleLabelMuted : null]}>
          {label}
        </ThemedText>
        <Pressable
          style={[
            styles.toggle,
            value ? styles.toggleEnabled : styles.toggleDisabled,
            disabled ? styles.toggleDisabledControl : null,
          ]}
          onPress={disabled ? undefined : onToggle}
          disabled={disabled}
          testID={testID}
        >
          <View
            style={[
              styles.toggleThumb,
              value ? styles.toggleThumbEnabled : styles.toggleThumbDisabled,
            ]}
          />
        </Pressable>
      </View>
      {plannedHint ? <ThemedText style={styles.plannedHint}>{plannedHint}</ThemedText> : null}
    </View>
  );
}

export default function AdminSettingsScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const navigation = useNavigation();
  const { settings, updateSettings, persistConfigNow, homeContent, updateHomeContent } = usePlatformConfig();
  const {
    loading: brandLoading,
    error: brandError,
    appNameDisplay,
    appVersionDisplay,
    appNameMuted,
    appVersionMuted,
    reload: reloadBrand,
  } = useAppBrandCopy();
  const [twoFactor, setTwoFactor] = useState(settings.twoFactorEnabled);
  const [sessionTimeout, setSessionTimeout] = useState(
    `${settings.sessionTimeoutMinutes} minutes`
  );
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    maintenanceMode,
    emailNotifications,
    pushNotifications,
    weeklyReport,
    featureFlags,
    appLabels,
  } = settings;

  const [maxAdvanceBooking, setMaxAdvanceBooking] = useState(String(settings.maxAdvanceBookingDays));
  const [minBookingNotice, setMinBookingNotice] = useState(String(settings.minBookingNoticeHours));
  const [instantBooking, setInstantBooking] = useState(settings.instantBooking);
  const [allowRescheduling, setAllowRescheduling] = useState(settings.allowRescheduling);
  const [freeCancellationWindow, setFreeCancellationWindow] = useState(String(settings.freeCancellationHours));
  const [cancellationFee, setCancellationFee] = useState(String(settings.cancellationFeePercent));
  const [allowPartialRefunds, setAllowPartialRefunds] = useState(settings.allowPartialRefunds);
  const [acceptUPI, setAcceptUPI] = useState(settings.acceptUPI);
  const [acceptCards, setAcceptCards] = useState(settings.acceptCards);
  const [acceptWallet, setAcceptWallet] = useState(settings.acceptWallet);
  const [payoutCycle, setPayoutCycle] = useState<"Weekly" | "Bi-Weekly" | "Monthly">(settings.payoutCycle);

  const handleSave = async () => {
    if (saving) return;
    setSaveError(null);
    setSaving(true);
    const timeoutMinutes = parseInt(sessionTimeout, 10) || settings.sessionTimeoutMinutes;
    updateSettings({
      maxAdvanceBookingDays: parseInt(maxAdvanceBooking, 10) || settings.maxAdvanceBookingDays,
      minBookingNoticeHours: parseInt(minBookingNotice, 10) || settings.minBookingNoticeHours,
      instantBooking,
      allowRescheduling,
      freeCancellationHours: parseInt(freeCancellationWindow, 10) || settings.freeCancellationHours,
      cancellationFeePercent: parseInt(cancellationFee, 10) || settings.cancellationFeePercent,
      allowPartialRefunds,
      acceptUPI,
      acceptCards,
      acceptWallet,
      payoutCycle,
      twoFactorEnabled: twoFactor,
      sessionTimeoutMinutes: timeoutMinutes,
    });
    const result = await persistConfigNow();
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
        <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
      </View>

      <ThemedText style={styles.subSectionTitle}>General</ThemedText>
      <View style={styles.settingsCard}>
        {brandError ? (
          <Pressable onPress={() => void reloadBrand()} testID="button-admin-brand-retry">
            <ThemedText style={styles.brandHintError}>{brandError} — tap to retry</ThemedText>
          </Pressable>
        ) : null}
        <ThemedText style={styles.inputLabel}>App Name</ThemedText>
        {brandLoading ? (
          <ActivityIndicator color={Colors.light.accent} style={styles.brandSpinner} />
        ) : (
          <TextInput
            style={[styles.input, styles.readonlyInput, appNameMuted ? styles.readonlyMuted : undefined]}
            value={appNameDisplay}
            editable={false}
            testID="input-app-name"
          />
        )}
        <ThemedText style={styles.brandEditHint}>
          Editable in Admin Support → About page (support_copy).
        </ThemedText>

        <ThemedText style={styles.inputLabel}>Version</ThemedText>
        {brandLoading ? (
          <ActivityIndicator color={Colors.light.accent} style={styles.brandSpinner} />
        ) : (
          <TextInput
            style={[styles.input, styles.readonlyInput, appVersionMuted ? styles.readonlyMuted : undefined]}
            value={appVersionDisplay}
            editable={false}
            testID="input-version"
          />
        )}

        <ToggleRow
          label="Maintenance Mode"
          value={maintenanceMode}
          onToggle={() => updateSettings({ maintenanceMode: !maintenanceMode })}
          testID="toggle-maintenance-mode"
        />
      </View>

      <ThemedText style={styles.subSectionTitle}>Notifications</ThemedText>
      <View style={styles.settingsCard}>
        <ToggleRow
          label="Email Notifications"
          value={emailNotifications}
          onToggle={() => updateSettings({ emailNotifications: !emailNotifications })}
          testID="toggle-email-notifications"
          disabled
          plannedHint="Stored for future use — platform email dispatch uses per-user preferences today."
        />
        <ToggleRow
          label="Push Notifications"
          value={pushNotifications}
          onToggle={() => updateSettings({ pushNotifications: !pushNotifications })}
          testID="toggle-push-notifications"
          disabled
          plannedHint="Stored for future use — push sends when EXPO_ACCESS_TOKEN is set and users opt in."
        />
        <ToggleRow
          label="Weekly Report"
          value={weeklyReport}
          onToggle={() => updateSettings({ weeklyReport: !weeklyReport })}
          testID="toggle-weekly-report"
          disabled
          plannedHint="Not implemented yet — no automated weekly report is sent."
        />
      </View>

      <ThemedText style={styles.subSectionTitle}>Security</ThemedText>
      <View style={styles.settingsCard}>
        <ToggleRow
          label="Two-Factor Authentication"
          value={twoFactor}
          onToggle={() => setTwoFactor(!twoFactor)}
          testID="toggle-two-factor"
          disabled
          plannedHint="Not enforced in the app yet — login remains email and password only."
        />

        <ThemedText style={styles.inputLabel}>Session Timeout</ThemedText>
        <TextInput
          style={[styles.input, styles.readonlyInput]}
          value={sessionTimeout}
          editable={false}
          placeholderTextColor={Colors.light.textSecondary}
          testID="input-session-timeout"
        />
        <ThemedText style={styles.plannedHint}>
          Saved for future use — sessions are not auto-expired by this value yet.
        </ThemedText>
      </View>

      <ThemedText style={styles.subSectionTitle}>Data</ThemedText>
      <View style={styles.settingsCard}>
        <View style={styles.dataButtonsRow}>
          <Pressable style={styles.outlinedButton} testID="button-export-data">
            <Feather name="download" size={16} color={Colors.light.accent} />
            <ThemedText style={styles.outlinedButtonText}>Export Data</ThemedText>
          </Pressable>
          <Pressable style={styles.outlinedButton} testID="button-clear-cache">
            <Feather name="trash-2" size={16} color={Colors.light.accent} />
            <ThemedText style={styles.outlinedButtonText}>Clear Cache</ThemedText>
          </Pressable>
        </View>
      </View>

      <ThemedText style={styles.subSectionTitle}>Booking Policies</ThemedText>
      <View style={styles.settingsCard}>
        <ThemedText style={styles.inputLabel}>Max Advance Booking (days)</ThemedText>
        <TextInput
          style={styles.input}
          value={maxAdvanceBooking}
          onChangeText={setMaxAdvanceBooking}
          keyboardType="numeric"
          placeholderTextColor={Colors.light.textSecondary}
          testID="input-max-advance-booking"
        />

        <ThemedText style={styles.inputLabel}>Min Booking Notice (hours)</ThemedText>
        <TextInput
          style={styles.input}
          value={minBookingNotice}
          onChangeText={setMinBookingNotice}
          keyboardType="numeric"
          placeholderTextColor={Colors.light.textSecondary}
          testID="input-min-booking-notice"
        />

        <ToggleRow
          label="Allow Instant Booking"
          value={instantBooking}
          onToggle={() => setInstantBooking(!instantBooking)}
          testID="toggle-instant-booking"
        />
        <ToggleRow
          label="Allow Rescheduling"
          value={allowRescheduling}
          onToggle={() => setAllowRescheduling(!allowRescheduling)}
          testID="toggle-allow-rescheduling"
          disabled
          plannedHint="Not implemented — users cancel and rebook to change session time."
        />
      </View>

      <ThemedText style={styles.subSectionTitle}>Cancellation Policy</ThemedText>
      <View style={styles.settingsCard}>
        <ThemedText style={styles.inputLabel}>Free Cancellation Window (hours)</ThemedText>
        <TextInput
          style={styles.input}
          value={freeCancellationWindow}
          onChangeText={setFreeCancellationWindow}
          keyboardType="numeric"
          placeholderTextColor={Colors.light.textSecondary}
          testID="input-free-cancellation-window"
        />

        <ThemedText style={styles.inputLabel}>Cancellation Fee (₹)</ThemedText>
        <TextInput
          style={styles.input}
          value={cancellationFee}
          onChangeText={setCancellationFee}
          keyboardType="numeric"
          placeholderTextColor={Colors.light.textSecondary}
          testID="input-cancellation-fee"
        />

        <ToggleRow
          label="Allow Partial Refunds"
          value={allowPartialRefunds}
          onToggle={() => setAllowPartialRefunds(!allowPartialRefunds)}
          testID="toggle-partial-refunds"
        />
      </View>

      <ThemedText style={styles.subSectionTitle}>Payment Settings</ThemedText>
      <ThemedText style={[styles.plannedHint, styles.sectionPlannedHint]}>
        Checkout uses Razorpay — these toggles are stored only and do not change the payment sheet yet.
      </ThemedText>
      <View style={styles.settingsCard}>
        <ToggleRow
          label="Accept UPI"
          value={acceptUPI}
          onToggle={() => setAcceptUPI(!acceptUPI)}
          testID="toggle-accept-upi"
          disabled
        />
        <ToggleRow
          label="Accept Cards"
          value={acceptCards}
          onToggle={() => setAcceptCards(!acceptCards)}
          testID="toggle-accept-cards"
          disabled
        />
        <ToggleRow
          label="Accept Wallet"
          value={acceptWallet}
          onToggle={() => setAcceptWallet(!acceptWallet)}
          testID="toggle-accept-wallet"
          disabled
        />

        <ThemedText style={styles.inputLabel}>Payout Cycle</ThemedText>
        <View style={styles.payoutRow}>
          <Pressable
            style={[styles.payoutButton, payoutCycle === "Weekly" ? styles.payoutButtonActive : null]}
            onPress={() => setPayoutCycle("Weekly")}
            testID="button-payout-weekly"
          >
            <ThemedText style={[styles.payoutButtonText, payoutCycle === "Weekly" ? styles.payoutButtonTextActive : null]}>Weekly</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.payoutButton, payoutCycle === "Bi-Weekly" ? styles.payoutButtonActive : null]}
            onPress={() => setPayoutCycle("Bi-Weekly")}
            testID="button-payout-biweekly"
          >
            <ThemedText style={[styles.payoutButtonText, payoutCycle === "Bi-Weekly" ? styles.payoutButtonTextActive : null]}>Bi-Weekly</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.payoutButton, payoutCycle === "Monthly" ? styles.payoutButtonActive : null]}
            onPress={() => setPayoutCycle("Monthly")}
            testID="button-payout-monthly"
          >
            <ThemedText style={[styles.payoutButtonText, payoutCycle === "Monthly" ? styles.payoutButtonTextActive : null]}>Monthly</ThemedText>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.saveButton} onPress={() => void handleSave()} disabled={saving} testID="button-save-settings">
        <ThemedText style={styles.saveButtonText}>{saving ? "Saving…" : "Save Settings"}</ThemedText>
      </Pressable>

      {saveError ? (
        <ThemedText style={styles.errorText}>{saveError}</ThemedText>
      ) : null}

      {saved ? (
        <View style={styles.confirmationBanner}>
          <Feather name="check-circle" size={16} color="#013220" />
          <ThemedText style={styles.confirmationText}>Settings saved successfully</ThemedText>
        </View>
      ) : null}

      {__DEV__ ? (
        <Pressable
          style={styles.debugLink}
          onPress={() => (navigation as any).navigate("FirebaseDebug")}
          testID="button-firebase-debug"
        >
          <Feather name="terminal" size={14} color={Colors.light.textMuted} />
          <ThemedText style={styles.debugLinkText}>Firebase Debug</ThemedText>
        </Pressable>
      ) : null}
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
  settingsCard: {
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
  readonlyInput: {
    opacity: 0.7,
  },
  readonlyMuted: {
    fontStyle: "italic",
    color: Colors.light.textSecondary,
  },
  brandSpinner: {
    marginBottom: Spacing.md,
    alignSelf: "flex-start",
  },
  brandEditHint: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: -6,
    marginBottom: Spacing.md,
  },
  brandHintError: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#8B3A3A",
    marginBottom: Spacing.sm,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  toggleBlock: {
    marginBottom: Spacing.xs,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    flex: 1,
  },
  toggleLabelMuted: {
    color: Colors.light.textMuted,
  },
  plannedHint: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    lineHeight: 17,
    marginBottom: Spacing.sm,
  },
  sectionPlannedHint: {
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  toggleDisabledControl: {
    opacity: 0.55,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleEnabled: {
    backgroundColor: "#013220",
  },
  toggleDisabled: {
    backgroundColor: "#AAB494",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  toggleThumbEnabled: {
    alignSelf: "flex-end",
  },
  toggleThumbDisabled: {
    alignSelf: "flex-start",
  },
  dataButtonsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    flexWrap: "wrap",
  },
  outlinedButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  outlinedButtonText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  payoutRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  payoutButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  payoutButtonActive: {
    backgroundColor: Colors.light.accent,
  },
  payoutButtonText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  payoutButtonTextActive: {
    color: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#8B3A3A",
    marginTop: Spacing.sm,
    textAlign: "center",
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
  debugLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  debugLinkText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
});
