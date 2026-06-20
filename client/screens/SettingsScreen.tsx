import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Switch, Pressable, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useAuth } from "@/context/AuthContext";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
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
import { requestAccountDeletion } from "@/services/accountDeletionService";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingsRowProps {
  label: string;
  onPress: () => void;
  labelMuted?: boolean;
  testID?: string;
}

function SettingsRow({ label, onPress, labelMuted, testID }: SettingsRowProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      testID={testID ?? `settings-row-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <ThemedText style={[styles.rowLabel, labelMuted ? styles.rowLabelMuted : undefined]}>{label}</ThemedText>
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
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

  const handleRequestAccountDeletion = () => {
    if (!session?.user) {
      Alert.alert("Sign in required", "Please sign in to request account deletion.");
      return;
    }
    Alert.alert(
      "Request account deletion",
      "Your account and personal data will be scheduled for deletion per our Account Deletion Policy. Pending orders or payouts may delay processing.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request deletion",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setDeletionSubmitting(true);
              const result = await requestAccountDeletion(undefined, session.access_token);
              setDeletionSubmitting(false);
              if (result.error) {
                Alert.alert("Could not submit request", result.error);
                return;
              }
              await refreshProfile();
              await signOut();
              Alert.alert(
                "Request received",
                "We have recorded your account deletion request. You will receive confirmation by email once processing is complete."
              );
            })();
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
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Settings</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 24) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account</ThemedText>
          <View style={styles.sectionCard}>
            <SettingsRow label="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
            <View style={styles.divider} />
            <SettingsRow label="Change Password" onPress={() => navigation.navigate("ChangePassword")} />
            <View style={styles.divider} />
            <SettingsRow
              label={deletionSubmitting ? "Submitting deletion request…" : "Request account deletion"}
              labelMuted={deletionSubmitting}
              onPress={handleRequestAccountDeletion}
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: 4,
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
    paddingHorizontal: Spacing.lg,
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
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  hintText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 13,
    color: "#8B3A3A",
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.brownLight,
    marginHorizontal: Spacing.lg,
  },
});
