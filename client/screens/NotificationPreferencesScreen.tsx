import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { updateProfilePreferences } from "@/services/profileService";
import {
  DEFAULT_PROFILE_PREFERENCES,
  parseProfilePreferences,
  type ProfilePreferences,
} from "@/types/profilePreferences";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";

function PrefRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        <ThemedText style={styles.rowDesc}>{description}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: Colors.light.accent }}
      />
    </View>
  );
}

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { profile, refreshProfile } = useAuth();
  const [prefs, setPrefs] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.preferences) {
      setPrefs(parseProfilePreferences(profile.preferences));
    }
  }, [profile?.preferences]);

  const save = async (next: ProfilePreferences) => {
    if (!profile) return;
    setPrefs(next);
    setSaving(true);
    await updateProfilePreferences(profile.id, next);
    await refreshProfile();
    setSaving(false);
  };

  const master = prefs.notificationsEnabled;

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: getScrollBottomPadding(insets.bottom, 24) },
        ]}
      >
        <PrefRow
          label="All notifications"
          description="Master switch for in-app alerts, email, and push (when enabled on device)"
          value={master}
          onChange={(v) => void save({ ...prefs, notificationsEnabled: v })}
        />
        <PrefRow
          label="Booking reminders"
          description="Session confirmations and reminders"
          value={prefs.bookingReminders && master}
          disabled={!master}
          onChange={(v) => void save({ ...prefs, bookingReminders: v })}
        />
        <PrefRow
          label="Order updates"
          description="Shipping, delivery, and refunds"
          value={prefs.orderUpdates && master}
          disabled={!master}
          onChange={(v) => void save({ ...prefs, orderUpdates: v })}
        />
        <PrefRow
          label="Community activity"
          description="Replies and mentions"
          value={prefs.communityActivity && master}
          disabled={!master}
          onChange={(v) => void save({ ...prefs, communityActivity: v })}
        />
        <PrefRow
          label="Promotions"
          description="Offers from sellers and practitioners"
          value={prefs.promotions && master}
          disabled={!master}
          onChange={(v) => void save({ ...prefs, promotions: v })}
        />
        <PrefRow
          label="Platform announcements"
          description="Application status and policy updates"
          value={prefs.platformAnnouncements && master}
          disabled={!master}
          onChange={(v) => void save({ ...prefs, platformAnnouncements: v })}
        />
        {saving ? (
          <ThemedText style={styles.saving}>Saving…</ThemedText>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundRoot },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 8,
  },
  headerIconButton: { padding: 8, width: 40 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  rowText: { flex: 1, paddingRight: Spacing.md },
  rowLabel: { fontSize: 15, fontWeight: "600", color: Colors.light.text },
  rowDesc: { fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  saving: { textAlign: "center", color: Colors.light.textMuted, marginTop: Spacing.md },
});
