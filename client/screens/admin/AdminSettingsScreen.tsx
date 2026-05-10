import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

function ToggleRow({
  label,
  value,
  onToggle,
  testID,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  testID: string;
}) {
  return (
    <View style={styles.toggleRow}>
      <ThemedText style={styles.toggleLabel}>{label}</ThemedText>
      <Pressable
        style={[styles.toggle, value ? styles.toggleEnabled : styles.toggleDisabled]}
        onPress={onToggle}
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
  );
}

export default function AdminSettingsScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const navigation = useNavigation();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30 minutes");
  const [saved, setSaved] = useState(false);

  const [maxAdvanceBooking, setMaxAdvanceBooking] = useState("30");
  const [minBookingNotice, setMinBookingNotice] = useState("2");
  const [instantBooking, setInstantBooking] = useState(true);
  const [allowRescheduling, setAllowRescheduling] = useState(true);

  const [freeCancellationWindow, setFreeCancellationWindow] = useState("24");
  const [cancellationFee, setCancellationFee] = useState("100");
  const [allowPartialRefunds, setAllowPartialRefunds] = useState(true);

  const [acceptUPI, setAcceptUPI] = useState(true);
  const [acceptCards, setAcceptCards] = useState(true);
  const [acceptWallet, setAcceptWallet] = useState(false);
  const [payoutCycle, setPayoutCycle] = useState<"Weekly" | "Bi-Weekly" | "Monthly">("Weekly");

  const handleSave = () => {
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
        <ThemedText style={styles.inputLabel}>App Name</ThemedText>
        <TextInput
          style={[styles.input, styles.readonlyInput]}
          value="Nature's Grace"
          editable={false}
          testID="input-app-name"
        />

        <ThemedText style={styles.inputLabel}>Version</ThemedText>
        <TextInput
          style={[styles.input, styles.readonlyInput]}
          value="1.0.0"
          editable={false}
          testID="input-version"
        />

        <ToggleRow
          label="Maintenance Mode"
          value={maintenanceMode}
          onToggle={() => setMaintenanceMode(!maintenanceMode)}
          testID="toggle-maintenance-mode"
        />
      </View>

      <ThemedText style={styles.subSectionTitle}>Notifications</ThemedText>
      <View style={styles.settingsCard}>
        <ToggleRow
          label="Email Notifications"
          value={emailNotifications}
          onToggle={() => setEmailNotifications(!emailNotifications)}
          testID="toggle-email-notifications"
        />
        <ToggleRow
          label="Push Notifications"
          value={pushNotifications}
          onToggle={() => setPushNotifications(!pushNotifications)}
          testID="toggle-push-notifications"
        />
        <ToggleRow
          label="Weekly Report"
          value={weeklyReport}
          onToggle={() => setWeeklyReport(!weeklyReport)}
          testID="toggle-weekly-report"
        />
      </View>

      <ThemedText style={styles.subSectionTitle}>Security</ThemedText>
      <View style={styles.settingsCard}>
        <ToggleRow
          label="Two-Factor Authentication"
          value={twoFactor}
          onToggle={() => setTwoFactor(!twoFactor)}
          testID="toggle-two-factor"
        />

        <ThemedText style={styles.inputLabel}>Session Timeout</ThemedText>
        <TextInput
          style={styles.input}
          value={sessionTimeout}
          onChangeText={setSessionTimeout}
          placeholderTextColor={Colors.light.textSecondary}
          testID="input-session-timeout"
        />
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

        <ThemedText style={styles.inputLabel}>Cancellation Fee (Rs.)</ThemedText>
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
      <View style={styles.settingsCard}>
        <ToggleRow
          label="Accept UPI"
          value={acceptUPI}
          onToggle={() => setAcceptUPI(!acceptUPI)}
          testID="toggle-accept-upi"
        />
        <ToggleRow
          label="Accept Cards"
          value={acceptCards}
          onToggle={() => setAcceptCards(!acceptCards)}
          testID="toggle-accept-cards"
        />
        <ToggleRow
          label="Accept Wallet"
          value={acceptWallet}
          onToggle={() => setAcceptWallet(!acceptWallet)}
          testID="toggle-accept-wallet"
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

      <Pressable style={styles.saveButton} onPress={handleSave} testID="button-save-settings">
        <ThemedText style={styles.saveButtonText}>Save Settings</ThemedText>
      </Pressable>

      {saved ? (
        <View style={styles.confirmationBanner}>
          <Feather name="check-circle" size={16} color="#013220" />
          <ThemedText style={styles.confirmationText}>Settings saved successfully</ThemedText>
        </View>
      ) : null}

      <Pressable
        style={styles.debugLink}
        onPress={() => (navigation as any).navigate("FirebaseDebug")}
        testID="button-firebase-debug"
      >
        <Feather name="terminal" size={14} color={Colors.light.textMuted} />
        <ThemedText style={styles.debugLinkText}>Firebase Debug</ThemedText>
      </Pressable>
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
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    flex: 1,
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
