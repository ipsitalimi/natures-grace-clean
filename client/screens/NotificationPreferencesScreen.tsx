import React, { useState, useEffect } from "react";
import { View, StyleSheet, Switch } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { updateProfilePreferences } from "@/services/profileService";
import {
  DEFAULT_PROFILE_PREFERENCES,
  parseProfilePreferences,
  type ProfilePreferences,
} from "@/types/profilePreferences";

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
  const { profile, refreshProfile } = useAuth();
  const [prefs, setPrefs] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.preferences) {
      setPrefs(parseProfilePreferences(profile.preferences));
    }
  }, [profile?.preferences]);

  const save = async (next: ProfilePreferences) => {
    if (!profile) return;
    const previous = prefs;
    setPrefs(next);
    setSaving(true);
    setSaveError(null);
    const result = await updateProfilePreferences(profile.id, next);
    if (result.error) {
      setPrefs(previous);
      setSaveError(result.error);
      setSaving(false);
      return;
    }
    await refreshProfile();
    setSaving(false);
  };

  const master = prefs.notificationsEnabled;

  return (
    <PageLayout
      title="Notification Preferences"
      titleInHeader
      header="back"
      contentContainerStyle={styles.content}
    >
      {saveError ? <ThemedText style={styles.saveError}>{saveError}</ThemedText> : null}
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
      {saving ? <ThemedText style={styles.saving}>Saving…</ThemedText> : null}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: LayoutSpacing.xs,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: LayoutSpacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  rowText: { flex: 1, paddingRight: LayoutSpacing.md },
  rowLabel: { fontSize: 15, fontWeight: "600", color: Colors.light.text },
  rowDesc: { fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  saving: { textAlign: "center", color: Colors.light.textMuted, marginTop: LayoutSpacing.md },
  saveError: {
    textAlign: "center",
    color: "#8B3A3A",
    fontSize: 13,
    marginBottom: LayoutSpacing.sm,
  },
});
