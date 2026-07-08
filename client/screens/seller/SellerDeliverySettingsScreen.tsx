import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { ScreenHeader } from "@/components/layout";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { formatInr } from "@/lib/formatCurrency";
import {
  DEFAULT_SELLER_DELIVERY_SETTINGS,
  formatDeliveryDuration,
  type DeliveryTierConfig,
  type DeliveryTierId,
  type SellerDeliverySettings,
} from "@/constants/sellerDelivery";
import {
  fetchSellerDeliveryByProfileId,
  updateSellerDeliveryByProfileId,
} from "@/services/commerce/sellerDeliveryService";

const TIER_META: Record<
  DeliveryTierId,
  { title: string; subtitle: string; canDisable: boolean }
> = {
  standard: {
    title: "Standard Delivery",
    subtitle: "Default option — always available to buyers.",
    canDisable: false,
  },
  express: {
    title: "Express Delivery",
    subtitle: "Faster shipping at an extra charge.",
    canDisable: true,
  },
  overnight: {
    title: "Overnight Delivery",
    subtitle: "Next business day delivery when offered.",
    canDisable: true,
  },
};

function TierEditor({
  tierId,
  config,
  onChange,
}: {
  tierId: DeliveryTierId;
  config: DeliveryTierConfig;
  onChange: (next: DeliveryTierConfig) => void;
}) {
  const meta = TIER_META[tierId];

  const setNum = (field: "minDays" | "maxDays" | "price", raw: string) => {
    const parsed = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    const value = Number.isFinite(parsed) ? parsed : 0;
    onChange({ ...config, [field]: value });
  };

  return (
    <View style={styles.tierCard}>
      <View style={styles.tierHeader}>
        <View style={styles.tierHeaderText}>
          <ThemedText style={styles.tierTitle}>{meta.title}</ThemedText>
          <ThemedText style={styles.tierSubtitle}>{meta.subtitle}</ThemedText>
        </View>
        {meta.canDisable ? (
          <Switch
            value={config.enabled}
            onValueChange={(enabled) => onChange({ ...config, enabled })}
            trackColor={{ false: Colors.light.divider, true: Colors.light.button }}
            thumbColor="#FFFFFF"
            testID={`switch-delivery-${tierId}`}
          />
        ) : (
          <View style={styles.alwaysOnBadge}>
            <ThemedText style={styles.alwaysOnText}>Required</ThemedText>
          </View>
        )}
      </View>

      {config.enabled ? (
        <>
          <View style={styles.previewRow}>
            <Feather name="clock" size={14} color={Colors.light.accent} />
            <ThemedText style={styles.previewText}>
              {formatDeliveryDuration(config, tierId)} ·{" "}
              {config.price <= 0 ? "Free" : formatInr(config.price)}
            </ThemedText>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <ThemedText style={styles.fieldLabel}>Min days</ThemedText>
              <TextInput
                style={styles.fieldInput}
                value={String(config.minDays)}
                onChangeText={(t) => setNum("minDays", t)}
                keyboardType="number-pad"
                testID={`input-${tierId}-min-days`}
              />
            </View>
            <View style={styles.fieldHalf}>
              <ThemedText style={styles.fieldLabel}>Max days</ThemedText>
              <TextInput
                style={styles.fieldInput}
                value={String(config.maxDays)}
                onChangeText={(t) => setNum("maxDays", t)}
                keyboardType="number-pad"
                testID={`input-${tierId}-max-days`}
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <ThemedText style={styles.fieldLabel}>Delivery fee (₹)</ThemedText>
            <TextInput
              style={styles.fieldInput}
              value={String(config.price)}
              onChangeText={(t) => setNum("price", t)}
              keyboardType="number-pad"
              testID={`input-${tierId}-price`}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function SellerDeliverySettingsScreen() {
  const { scrollPaddingBottom } = useLayoutInsets(24);
  const { session } = useAuth();
  const [settings, setSettings] = useState<SellerDeliverySettings>({
    ...DEFAULT_SELLER_DELIVERY_SETTINGS,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!isSupabaseConfigured() || !session?.user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const res = await fetchSellerDeliveryByProfileId(session.user.id);
    setLoading(false);
    if (!res.ok) {
      setLoadError(res.error);
      return;
    }
    setSettings(res.profile.settings);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings])
  );

  const updateTier = (tierId: DeliveryTierId, next: DeliveryTierConfig) => {
    setSettings((prev) => ({ ...prev, [tierId]: next }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!session?.user?.id || saving) return;
    setSaving(true);
    setSaveError(null);
    const res = await updateSellerDeliveryByProfileId(session.user.id, settings);
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error);
      return;
    }
    setSettings(res.profile.settings);
    setSaved(true);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader variant="back" title="Delivery Options" showNotifications={false} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
        </View>
      ) : loadError ? (
        <View style={styles.centered}>
          <ThemedText style={styles.errorText}>{loadError}</ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={styles.intro}>
            Set how long deliveries take and which speed options you offer. Buyers only see the
            options you enable here.
          </ThemedText>

          <TierEditor
            tierId="standard"
            config={settings.standard}
            onChange={(next) => updateTier("standard", next)}
          />
          <TierEditor
            tierId="express"
            config={settings.express}
            onChange={(next) => updateTier("express", next)}
          />
          <TierEditor
            tierId="overnight"
            config={settings.overnight}
            onChange={(next) => updateTier("overnight", next)}
          />

          {saveError ? <ThemedText style={styles.errorText}>{saveError}</ThemedText> : null}
          {saved ? (
            <View style={styles.savedBanner}>
              <Feather name="check-circle" size={16} color={Colors.light.accent} />
              <ThemedText style={styles.savedText}>Delivery settings saved</ThemedText>
            </View>
          ) : null}

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
            testID="button-save-delivery-settings"
          >
            <ThemedText style={styles.saveButtonText}>
              {saving ? "Saving…" : "Save Delivery Settings"}
            </ThemedText>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.lg,
  },
  tierCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tierHeaderText: {
    flex: 1,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  tierSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  alwaysOnBadge: {
    backgroundColor: `${Colors.light.accent}15`,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  alwaysOnText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.md,
  },
  previewText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  fieldRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldBlock: {
    marginBottom: Spacing.xs,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.text,
  },
  saveButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  savedText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  errorText: {
    fontSize: 14,
    color: "#C0392B",
    textAlign: "center",
    marginVertical: Spacing.sm,
  },
});
