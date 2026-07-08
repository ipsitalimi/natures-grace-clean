import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import { homeRouteForRole, useAuth } from "@/context/AuthContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ChangePassword">;

export default function ChangePasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { changePassword, isConfigured, pendingPasswordRecovery, profile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const pageTitle = pendingPasswordRecovery ? "Reset Password" : "Change Password";

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
    <PageLayout
      title={pageTitle}
      titleInHeader
      header="back"
      headerProps={{
        showNotifications: false,
        ...(pendingPasswordRecovery
          ? { leftAction: <View style={styles.headerSpacer} /> }
          : {}),
      }}
      contentContainerStyle={styles.content}
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
        <ThemedText style={styles.confirmationText} testID="text-password-updated">
          Password Updated
        </ThemedText>
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
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: LayoutSpacing.md,
  },
  fieldGroup: {
    marginBottom: LayoutSpacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginBottom: LayoutSpacing.sm,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: LayoutSpacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.light.text,
  },
  requirementsNote: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: LayoutSpacing.xl,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#C0392B",
    textAlign: "center",
    marginBottom: LayoutSpacing.md,
  },
  confirmationText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
    textAlign: "center",
    marginBottom: LayoutSpacing.md,
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
  headerSpacer: {
    width: 40,
    height: 40,
  },
});
