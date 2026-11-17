import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { Practitioner } from "@/data/practitioners";
import {
  fetchPractitionerPricingRules,
  savePractitionerPricingRule,
  SUPPORTED_SESSION_DURATIONS,
  type PractitionerPricingRule,
} from "@/services/content/practitionerPricingService";

type Draft = { enabled: boolean; min: string; max: string };
const LABELS: Record<number, string> = {
  15: "15 minutes", 20: "20 minutes", 30: "30 minutes", 45: "45 minutes", 60: "60 minutes",
};

export default function AdminPractitionerPricingEditor({
  visible,
  practitioner,
  onClose,
}: {
  visible: boolean;
  practitioner: Practitioner | null;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible || !practitioner) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchPractitionerPricingRules(practitioner.id).then((rules: PractitionerPricingRule[]) => {
      if (cancelled) return;
      const next: Record<number, Draft> = {};
      for (const duration of SUPPORTED_SESSION_DURATIONS) {
        const rule = rules.find((item) => item.duration_minutes === duration);
        next[duration] = rule
          ? { enabled: rule.is_enabled, min: String(rule.min_price), max: String(rule.max_price) }
          : { enabled: false, min: "0", max: "10000" };
      }
      setDrafts(next);
      setLoading(false);
    }).catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Could not load pricing rules.");
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [visible, practitioner?.id]);

  const update = (duration: number, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [duration]: { ...prev[duration], ...patch } }));
  };

  const save = async () => {
    if (!practitioner || saving) return;
    setSaving(true);
    setError("");
    try {
      for (const duration of SUPPORTED_SESSION_DURATIONS) {
        const draft = drafts[duration];
        const min = Number(draft?.min);
        const max = Number(draft?.max);
        if (!draft || draft.min.trim() === "" || draft.max.trim() === ""
          || !Number.isInteger(min) || !Number.isInteger(max)
          || min < 0 || max > 10000 || min > max) {
          setError(`Check the minimum and maximum for ${LABELS[duration]}. Use whole-rupee values from ₹0 to ₹10,000.`);
          return;
        }
      }

      for (const duration of SUPPORTED_SESSION_DURATIONS) {
        const draft = drafts[duration];
        const result = await savePractitionerPricingRule({
          practitionerId: practitioner.id,
          durationMinutes: duration,
          enabled: draft.enabled,
          minPrice: Number(draft.min),
          maxPrice: Number(draft.max),
        });
        if (!result.ok) {
          setError(`Could not save ${LABELS[duration]}: ${result.error}`);
          return;
        }
      }

      // Read the rules back from Supabase before closing. This prevents the
      // admin UI from implying that pricing was saved when the write did not
      // land in the same project/table the practitioner app reads.
      const savedRules = await fetchPractitionerPricingRules(practitioner.id);
      const missingOrDifferent = SUPPORTED_SESSION_DURATIONS.find((duration) => {
        const draft = drafts[duration];
        const saved = savedRules.find((rule) => rule.duration_minutes === duration);
        return !saved ||
          saved.is_enabled !== draft.enabled ||
          saved.min_price !== Number(draft.min) ||
          saved.max_price !== Number(draft.max);
      });
      if (missingOrDifferent !== undefined) {
        setError(
          `Supabase did not confirm the saved ${LABELS[missingOrDifferent]} rule. Keep this window open and check the admin account's permissions and app environment.`
        );
        return;
      }

      onClose();
    } catch (err) {
      console.error("[AdminPractitionerPricingEditor] save failed:", err);
      setError(err instanceof Error ? err.message : "Could not save pricing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <ThemedText style={styles.title}>Session pricing</ThemedText>
              <ThemedText style={styles.subtitle}>{practitioner?.name ?? "Practitioner"}</ThemedText>
            </View>
            <Pressable onPress={onClose} disabled={saving} style={styles.close}>
              <Feather name="x" size={20} color={Colors.light.text} />
            </Pressable>
          </View>
          <ThemedText style={styles.help}>
            Set the permitted price range for each session duration. Practitioners can choose any whole-rupee price within an enabled range.
          </ThemedText>
          {loading ? (
            <View style={styles.loading}><ActivityIndicator color={Colors.light.accent} /><ThemedText>Loading pricing rules…</ThemedText></View>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {SUPPORTED_SESSION_DURATIONS.map((duration) => {
                const draft = drafts[duration] ?? { enabled: false, min: "0", max: "10000" };
                return (
                  <View key={duration} style={styles.ruleCard}>
                    <View style={styles.ruleHeader}>
                      <ThemedText style={styles.duration}>{LABELS[duration]}</ThemedText>
                      <View style={styles.toggle}>
                        <ThemedText style={styles.toggleLabel}>{draft.enabled ? "Enabled" : "Disabled"}</ThemedText>
                        <Switch value={draft.enabled} onValueChange={(enabled) => update(duration, { enabled })} />
                      </View>
                    </View>
                    <View style={styles.inputs}>
                      <View style={styles.inputGroup}>
                        <ThemedText style={styles.inputLabel}>Minimum (₹)</ThemedText>
                        <TextInput value={draft.min} onChangeText={(min) => update(duration, { min })} keyboardType="number-pad" style={styles.input} editable={!saving} />
                      </View>
                      <View style={styles.inputGroup}>
                        <ThemedText style={styles.inputLabel}>Maximum (₹)</ThemedText>
                        <TextInput value={draft.max} onChangeText={(max) => update(duration, { max })} keyboardType="number-pad" style={styles.input} editable={!saving} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <View style={styles.actions}>
            <Pressable onPress={onClose} disabled={saving} style={styles.cancel}><ThemedText style={styles.cancelText}>Cancel</ThemedText></Pressable>
            <Pressable onPress={() => void save()} disabled={loading || saving} style={styles.save}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <ThemedText style={styles.saveText}>Save pricing</ThemedText>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "center", padding: Spacing.lg },
  card: { backgroundColor: Colors.light.cardBackground, borderRadius: BorderRadius.lg, padding: Spacing.lg, maxHeight: "90%" },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  heading: { flex: 1, gap: 3 },
  title: { fontSize: 19, fontFamily: "Nunito_700Bold", color: Colors.light.accent },
  subtitle: { fontSize: 13, color: Colors.light.textSecondary },
  close: { padding: 4 },
  help: { fontSize: 12, lineHeight: 18, color: Colors.light.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.md },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: Spacing.sm, paddingBottom: Spacing.xs },
  ruleCard: { borderWidth: 1, borderColor: Colors.light.divider, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm },
  ruleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  duration: { fontSize: 14, fontFamily: "Nunito_700Bold", color: Colors.light.text },
  toggle: { flexDirection: "row", alignItems: "center", gap: 6 },
  toggleLabel: { fontSize: 11, color: Colors.light.textSecondary },
  inputs: { flexDirection: "row", gap: Spacing.sm },
  inputGroup: { flex: 1, gap: 5 },
  inputLabel: { fontSize: 11, color: Colors.light.textSecondary },
  input: { borderWidth: 1, borderColor: Colors.light.divider, borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 9, color: Colors.light.text, backgroundColor: Colors.light.backgroundRoot },
  loading: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, padding: Spacing.xl },
  error: { color: "#B42318", fontSize: 12, marginTop: Spacing.sm },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: Spacing.md, marginTop: Spacing.lg },
  cancel: { paddingVertical: 11, paddingHorizontal: 12 },
  cancelText: { color: Colors.light.textSecondary, fontFamily: "Nunito_700Bold" },
  save: { backgroundColor: Colors.light.accent, borderRadius: BorderRadius.sm, minWidth: 120, alignItems: "center", paddingVertical: 12, paddingHorizontal: 16 },
  saveText: { color: "#fff", fontFamily: "Nunito_700Bold" },
});
