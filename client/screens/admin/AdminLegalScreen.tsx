import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import {
  DEFAULT_LEGAL_VERSIONS,
  type LegalDocumentKey,
  type LegalVersions,
} from "@/types/legal";
import { fetchLegalVersions } from "@/services/legal/legalAcceptanceService";
import { saveLegalVersions } from "@/services/legal/legalVersionsAdminService";

const VERSION_LABELS: Record<LegalDocumentKey, string> = {
  user_terms: "User Terms & Conditions",
  privacy_policy: "Privacy Policy",
  refund_policy: "Refund & Cancellation Policy",
  medical_disclaimer: "Medical & Wellness Disclaimer",
  account_deletion_policy: "Account Deletion Policy",
  grievance_policy: "Contact & Grievance Policy",
  community_guidelines: "Community Guidelines",
  shipping_policy: "Shipping Policy",
  practitioner_agreement: "Practitioner Agreement",
  seller_agreement: "Seller Agreement",
};

export default function AdminLegalScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const { refreshRemoteConfig } = usePlatformConfig();
  const [versions, setVersions] = useState<LegalVersions>({ ...DEFAULT_LEGAL_VERSIONS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const remote = await fetchLegalVersions();
    setVersions(remote);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveLegalVersions(versions);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save legal versions");
      return;
    }
    await refreshRemoteConfig();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateVersion = (key: LegalDocumentKey, value: string) => {
    setVersions((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={onBackToDashboard} testID="admin-legal-back">
          <Feather name="arrow-left" size={20} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Legal Management</ThemedText>
      </View>

      <ThemedText style={styles.intro}>
        Update version strings when legal documents change. Users with an outdated version will be
        prompted to re-accept only the affected document on their next app launch.
      </ThemedText>

      {loading ? (
        <ActivityIndicator color={Colors.light.accent} style={{ marginTop: 24 }} />
      ) : (
        <>
          {(Object.keys(VERSION_LABELS) as LegalDocumentKey[]).map((key) => (
            <View key={key} style={styles.fieldRow}>
              <ThemedText style={styles.fieldLabel}>{VERSION_LABELS[key]}</ThemedText>
              <TextInput
                style={styles.input}
                value={versions[key]}
                onChangeText={(text) => updateVersion(key, text)}
                placeholder="v1.0"
                placeholderTextColor={Colors.light.textMuted}
                autoCapitalize="none"
                testID={`admin-legal-version-${key}`}
              />
            </View>
          ))}

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
          {saved ? (
            <ThemedText style={styles.successText}>Legal versions saved.</ThemedText>
          ) : null}

          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
            testID="admin-legal-save"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.saveBtnText}>Save Versions</ThemedText>
            )}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing["3xl"] },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
  },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.light.textMuted,
    marginBottom: Spacing.xl,
  },
  fieldRow: { marginBottom: Spacing.lg },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.text,
  },
  errorText: {
    fontSize: 13,
    color: "#B33A3A",
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: 13,
    color: Colors.light.accent,
    marginBottom: Spacing.md,
  },
  saveBtn: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
