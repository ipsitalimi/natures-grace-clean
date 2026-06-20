import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { homeRouteForRole, useAuth } from "@/context/AuthContext";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ChangePassword">;

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { changePassword, isConfigured, pendingPasswordRecovery, profile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    setError("");
    if (!isConfigured) {
      setError("Password change requires a configured backend.");
      return;
    }
    if (!pendingPasswordRecovery && !currentPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    const result = await changePassword(newPassword, pendingPasswordRecovery ? undefined : currentPassword);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setConfirmation(true);

    if (pendingPasswordRecovery && profile) {
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: homeRouteForRole(profile.role) }],
        });
      }, 1200);
      return;
    }

    setTimeout(() => setConfirmation(false), 2500);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        {!pendingPasswordRecovery ? (
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
        ) : (
          <View style={styles.headerIconButton} />
        )}
        <View style={styles.headerCenter} />
        <View style={styles.headerIconButton} />
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>
          {pendingPasswordRecovery ? "Reset Password" : "Change Password"}
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 24) }]}
        showsVerticalScrollIndicator={false}
      >
        {!pendingPasswordRecovery ? (
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Current Password</ThemedText>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor={Colors.light.textSecondary}
              secureTextEntry
              testID="input-current-password"
            />
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>New Password</ThemedText>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor={Colors.light.textSecondary}
            secureTextEntry
            testID="input-new-password"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Confirm New Password</ThemedText>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={Colors.light.textSecondary}
            secureTextEntry
            testID="input-confirm-password"
          />
        </View>

        <ThemedText style={styles.requirementsNote}>Password must be at least 8 characters</ThemedText>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        {confirmation ? (
          <ThemedText style={styles.confirmationText} testID="text-password-updated">Password Updated</ThemedText>
        ) : null}

        <Pressable
          style={[styles.updateButton, saving && styles.updateButtonDisabled]}
          onPress={() => void handleUpdate()}
          disabled={saving}
          testID="button-update-password"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.updateButtonText}>Update Password</ThemedText>
          )}
        </Pressable>
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
    paddingTop: Spacing.xl,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.light.text,
  },
  requirementsNote: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xl,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#C0392B",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  confirmationText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  updateButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
