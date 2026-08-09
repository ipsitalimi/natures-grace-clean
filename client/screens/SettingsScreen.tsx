import React, { useCallback, useState } from "react";
import { View, StyleSheet, Switch, Pressable, ActivityIndicator, Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { updateProfilePreferences } from "@/services/profileService";
import {
  DEFAULT_PROFILE_PREFERENCES,
  parseProfilePreferences,
} from "@/types/profilePreferences";
import {
  SETTINGS_ABOUT_ROW_KEY,
  SUPPORT_HUB_CONTACT_TITLE_KEY,
  SUPPORT_HUB_HELP_TITLE_KEY,
  fetchSupportCopyMap,
  formatSupportCopyLabel,
  getSupportCopyKey,
} from "@/services/content/helpSupportService";
import { deleteMyAccount } from "@/services/accountDeletionService";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingsRowProps {
  label: string;
  onPress: () => void;
  labelMuted?: boolean;
  disabled?: boolean;
  testID?: string;
}

function SettingsRow({ label, onPress, labelMuted, disabled, testID }: SettingsRowProps) {
  return (
    <Pressable
      style={[styles.row, disabled ? styles.rowDisabled : undefined]}
      onPress={onPress}
      disabled={disabled}
      testID={testID ?? `settings-row-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <ThemedText style={[styles.rowLabel, labelMuted || disabled ? styles.rowLabelMuted : undefined]}>
        {label}
      </ThemedText>
      <Feather name="chevron-right" size={18} color={Colors.light.textSecondary} />
    </Pressable>
  );
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, value, onValueChange, disabled }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <ThemedText style={[styles.rowLabel, disabled ? styles.rowLabelMuted : undefined]}>{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: Colors.light.backgroundTertiary, true: `${Colors.light.accent}60` }}
        thumbColor={value ? Colors.light.accent : Colors.light.backgroundSecondary}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    DEFAULT_PROFILE_PREFERENCES.notificationsEnabled
  );
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [copyMap, setCopyMap] = useState<Record<string, string> | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);

  const hasLoadedCopy = Boolean(copyMap !== null && !copyLoading && !copyError && isSupabaseConfigured());

  const loadSettingsCopy = useCallback(async () => {
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
      void loadSettingsCopy();
    }, [loadSettingsCopy])
  );

  useFocusEffect(
    useCallback(() => {
      if (profile?.preferences) {
        const prefs = parseProfilePreferences(profile.preferences);
        setNotificationsEnabled(prefs.notificationsEnabled);
      }
    }, [profile?.preferences, profile?.updated_at])
  );

  const persistPreference = useCallback(
    async (patch: Partial<{ notificationsEnabled: boolean }>) => {
      if (!isSupabaseConfigured() || !session?.user) return;
      setPrefsSaving(true);
      setPrefsError(null);
      const result = await updateProfilePreferences(session.user.id, patch);
      setPrefsSaving(false);
      if (result.error) {
        setPrefsError(result.error);
        await refreshProfile();
        return;
      }
      await refreshProfile();
    },
    [session?.user, refreshProfile]
  );

  const handleNotificationsToggle = (val: boolean) => {
    setNotificationsEnabled(val);
    void persistPreference({ notificationsEnabled: val });
  };

  const handleDeleteAccount = () => {
    if (deletionSubmitting) return;
    if (!session?.user) {
      Alert.alert("Sign in required", "Please sign in to delete your account.");
      return;
    }
    Alert.alert(
      "Delete account",
      "This action is permanent. You will lose your profile, orders, bookings, and all account data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Deleting your account cannot be undone.",
              [
                { text: "Keep account", style: "cancel" },
                {
                  text: "Yes, delete",
                  style: "destructive",
                  onPress: () => {
                    void (async () => {
                      if (deletionSubmitting) return;
                      setDeletionSubmitting(true);
                      try {
                        const result = await deleteMyAccount(session.access_token);
                        if (result.error) {
                          Alert.alert("Could not delete account", result.error);
                          return;
                        }
                        await refreshProfile();
                        await signOut();
                        Alert.alert("Account deleted", "Your account has been permanently deleted.");
                      } finally {
                        setDeletionSubmitting(false);
                      }
                    })();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const prefsDisabled =
    !isSupabaseConfigured() || !session?.user || prefsSaving;

  const supportRowLabel = (key: string) => {
    if (!isSupabaseConfigured()) return "";
    if (copyLoading) return "…";
    return formatSupportCopyLabel(getSupportCopyKey(copyMap, key), { showEmpty: hasLoadedCopy });
  };

  const helpRowLabel = supportRowLabel(SUPPORT_HUB_HELP_TITLE_KEY);
  const contactRowLabel = supportRowLabel(SUPPORT_HUB_CONTACT_TITLE_KEY);
  const aboutRowLabel = supportRowLabel(SETTINGS_ABOUT_ROW_KEY);

  return (
    <PageLayout title="Settings" titleInHeader header="back">
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Account</ThemedText>
        <View style={styles.sectionCard}>
          <SettingsRow label="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
          <View style={styles.divider} />
          <SettingsRow label="Change Password" onPress={() => navigation.navigate("ChangePassword")} />
          <View style={styles.divider} />
          <SettingsRow
            label={deletionSubmitting ? "Deleting account…" : "Delete account"}
            labelMuted={deletionSubmitting}
            onPress={handleDeleteAccount}
            disabled={deletionSubmitting}
            testID="settings-row-account-deletion"
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>
        {!session?.user && isSupabaseConfigured() ? (
          <ThemedText style={styles.hintText}>Sign in to save notification preferences.</ThemedText>
        ) : null}
        {prefsError ? (
          <ThemedText style={styles.errorText}>{prefsError}</ThemedText>
        ) : null}
        <View style={styles.sectionCard}>
          <ToggleRow
            label="Notifications"
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            disabled={prefsDisabled}
          />
          <SettingsRow
            label="Notification preferences"
            onPress={() => navigation.navigate("NotificationPreferences" as never)}
            testID="settings-row-notification-prefs"
          />
          <SettingsRow
            label="Application status"
            onPress={() => navigation.navigate("ApplicationStatus" as never)}
            testID="settings-row-application-status"
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Support</ThemedText>
        {!isSupabaseConfigured() ? (
          <ThemedText style={styles.hintText}>Connect Supabase for editable About row copy.</ThemedText>
        ) : null}
        {copyLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.light.accent} size="small" />
            <ThemedText style={styles.hintText}>Loading support copy…</ThemedText>
          </View>
        ) : null}
        {copyError ? (
          <Pressable onPress={() => void loadSettingsCopy()} testID="button-settings-copy-retry">
            <ThemedText style={styles.errorText}>{copyError} — tap to retry</ThemedText>
          </Pressable>
        ) : null}
        <View style={styles.sectionCard}>
          <SettingsRow
            label={helpRowLabel}
            labelMuted={hasLoadedCopy && !getSupportCopyKey(copyMap, SUPPORT_HUB_HELP_TITLE_KEY)}
            onPress={() => navigation.navigate("Help")}
            testID="settings-row-help"
          />
          <View style={styles.divider} />
          <SettingsRow
            label={contactRowLabel}
            labelMuted={hasLoadedCopy && !getSupportCopyKey(copyMap, SUPPORT_HUB_CONTACT_TITLE_KEY)}
            onPress={() => navigation.navigate("Contact")}
            testID="settings-row-contact"
          />
          <View style={styles.divider} />
          <SettingsRow
            label={aboutRowLabel}
            labelMuted={hasLoadedCopy && !getSupportCopyKey(copyMap, SETTINGS_ABOUT_ROW_KEY)}
            onPress={() => navigation.navigate("About")}
            testID="settings-row-about"
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Legal & Policies</ThemedText>
        <View style={styles.sectionCard}>
          <SettingsRow
            label="View accepted policies"
            onPress={() => navigation.navigate("UserLegalPolicies")}
            testID="settings-row-legal-policies"
          />
          <SettingsRow
            label="Trust & Safety"
            onPress={() => navigation.navigate("TrustSafety" as never)}
            testID="settings-row-trust-safety"
          />
        </View>
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: LayoutSpacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: LayoutSpacing.sm,
    marginLeft: LayoutSpacing.xs,
  },
  sectionCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: LayoutSpacing.md,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.light.text,
  },
  rowLabelMuted: {
    fontStyle: "italic",
    color: Colors.light.textSecondary,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: LayoutSpacing.sm,
    marginBottom: LayoutSpacing.sm,
    marginLeft: LayoutSpacing.xs,
  },
  hintText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: LayoutSpacing.sm,
    marginLeft: LayoutSpacing.xs,
  },
  errorText: {
    fontSize: 13,
    color: "#8B3A3A",
    marginBottom: LayoutSpacing.sm,
    marginLeft: LayoutSpacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.brownLight,
    marginHorizontal: LayoutSpacing.md,
  },
});
