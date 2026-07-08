import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { ScreenHeader } from "@/components/layout";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import type { SellerPromo } from "@/data/sellerMockData";
import { formatInr, formatInrOff } from "@/lib/formatCurrency";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { useAuth } from "@/context/AuthContext";
import { resolveSellerIdByProfileId } from "@/services/commerce/sellerId";
import {
  createSellerPromo,
  deleteSellerPromo,
  generateCampaignCode,
  listSellerPromos,
  toSellerPromoDisplay,
  updateSellerPromo,
  type SellerPromoKind,
  type SellerPromoRow,
} from "@/services/commerce/sellerPromosService";

type SellerPromoView = SellerPromo & {
  dbStatus: SellerPromoRow["status"];
  promoKind: SellerPromoKind;
  startsAt: string | null;
  expiresAtIso: string | null;
};

function pickLiveCampaign(rows: SellerPromoView[], kind: Exclude<SellerPromoKind, "standard">): SellerPromoView | null {
  return rows.find((r) => r.promoKind === kind && (r.status === "Active" || r.status === "Paused")) ?? null;
}

function campaignDiscountLabel(promo: SellerPromoView): string {
  return promo.type === "Percentage" ? `${promo.value}% OFF` : formatInrOff(promo.value);
}

function PromoCard({
  promo,
  onTogglePause,
  onDelete,
}: {
  promo: SellerPromoView;
  onTogglePause: (p: SellerPromoView) => void;
  onDelete: (p: SellerPromoView) => void;
}) {
  const statusColor =
    promo.status === "Active"
      ? { bg: "rgba(1,50,32,0.08)", text: "#013220" }
      : promo.status === "Paused"
        ? { bg: "rgba(212,148,58,0.12)", text: "#B8860B" }
        : { bg: "rgba(139,58,58,0.08)", text: "#8B3A3A" };

  const usagePct =
    promo.usageLimit != null && promo.usageLimit > 0
      ? Math.min((promo.usageCount / promo.usageLimit) * 100, 100)
      : 0;

  return (
    <View style={styles.promoCard} testID={`promo-card-${promo.id}`}>
      <View style={styles.promoTopRow}>
        <View style={styles.promoCodeBadge}>
          <Feather name="tag" size={12} color={Colors.light.accent} />
          <ThemedText style={styles.promoCode}>{promo.code}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <ThemedText style={[styles.statusText, { color: statusColor.text }]}>{promo.status}</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.promoDesc}>{promo.description}</ThemedText>

      <View style={styles.promoValueRow}>
        <ThemedText style={styles.promoValue}>
          {promo.type === "Percentage" ? `${promo.value}% OFF` : formatInrOff(promo.value)}
        </ThemedText>
        <ThemedText style={styles.promoExpiry}>Expires {promo.expiry}</ThemedText>
      </View>

      <View style={styles.usageRow}>
        <ThemedText style={styles.usageLabel}>
          {promo.usageLimit == null ? `${promo.usageCount}/∞ used` : `${promo.usageCount}/${promo.usageLimit} used`}
        </ThemedText>
        {promo.usageLimit != null ? (
          <View style={styles.usageBarTrack}>
            <View style={[styles.usageBar, { width: `${usagePct}%` }]} />
          </View>
        ) : null}
      </View>

      <View style={styles.promoActions}>
        {promo.status !== "Expired" ? (
          <Pressable style={styles.actionBtn} onPress={() => onTogglePause(promo)} testID={`button-toggle-${promo.id}`}>
            <Feather name={promo.dbStatus === "Paused" ? "play-circle" : "pause-circle"} size={14} color={Colors.light.accent} />
            <ThemedText style={styles.actionBtnText}>{promo.dbStatus === "Paused" ? "Resume" : "Pause"}</ThemedText>
          </Pressable>
        ) : null}
        <Pressable style={styles.actionBtnDanger} onPress={() => onDelete(promo)} testID={`button-delete-${promo.id}`}>
          <Feather name="trash-2" size={14} color="#8B3A3A" />
          <ThemedText style={styles.actionBtnDangerText}>Delete</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function FlashCampaignSetup({
  sellerId,
  existing,
  onClose,
  onSaved,
}: {
  sellerId: string | null;
  existing: SellerPromoView | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState(existing ? String(existing.value) : "");
  const [usageLimit, setUsageLimit] = useState(
    existing?.usageLimit != null ? String(existing.usageLimit) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!sellerId || !value.trim()) return;
    const discountValue = parseFloat(value);
    if (Number.isNaN(discountValue) || discountValue <= 0) {
      setError("Enter a valid discount percentage.");
      return;
    }
    const limitTrim = usageLimit.trim();
    const usageLimitNum = limitTrim === "" ? null : parseInt(limitTrim, 10);
    if (limitTrim !== "" && (Number.isNaN(usageLimitNum) || usageLimitNum! <= 0)) {
      setError("Usage limit must be a positive integer or blank for unlimited.");
      return;
    }

    setSaving(true);
    setError(null);

    if (existing) {
      const res = await updateSellerPromo(existing.id, {
        discount_type: "percentage",
        discount_value: discountValue,
        usage_limit: usageLimitNum,
      });
      setSaving(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
    } else {
      const now = new Date();
      const ends = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const res = await createSellerPromo({
        sellerId,
        code: generateCampaignCode("FLASH"),
        description: "24-hour flash sale",
        discountType: "percentage",
        discountValue,
        usageLimit: usageLimitNum,
        startsAtIso: now.toISOString(),
        expiresAtIso: ends.toISOString(),
        promoKind: "flash_sale",
      });
      setSaving(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
    }

    await onSaved();
    onClose();
  };

  return (
    <View style={styles.campaignSetup}>
      <ThemedText style={styles.formLabel}>Flash discount (%)</ThemedText>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={setValue}
        placeholder="e.g. 15"
        placeholderTextColor={Colors.light.textMuted}
        keyboardType="decimal-pad"
        testID="input-flash-discount"
      />
      <ThemedText style={styles.formLabel}>Max uses (blank = unlimited)</ThemedText>
      <TextInput
        style={styles.formInput}
        value={usageLimit}
        onChangeText={setUsageLimit}
        placeholder="e.g. 50"
        placeholderTextColor={Colors.light.textMuted}
        keyboardType="number-pad"
        testID="input-flash-usage-limit"
      />
      {!existing ? (
        <ThemedText style={styles.campaignHint}>Starts immediately and runs for 24 hours.</ThemedText>
      ) : null}
      {error ? <ThemedText style={styles.inlineError}>{error}</ThemedText> : null}
      <View style={styles.campaignSetupActions}>
        <Pressable style={styles.campaignCancelBtn} onPress={onClose} testID="button-flash-cancel">
          <ThemedText style={styles.campaignCancelText}>Cancel</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.flashBtn, (!value.trim() || saving || !sellerId) && styles.saveBtnDisabled]}
          onPress={() => void handleSave()}
          disabled={!value.trim() || saving || !sellerId}
          testID="button-flash-save"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.flashBtnText}>{existing ? "Save" : "Launch"}</ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function BundleCampaignSetup({
  sellerId,
  existing,
  onClose,
  onSaved,
}: {
  sellerId: string | null;
  existing: SellerPromoView | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [description, setDescription] = useState(existing?.description ?? "");
  const [type, setType] = useState<"Percentage" | "Fixed">(existing?.type ?? "Percentage");
  const [value, setValue] = useState(existing ? String(existing.value) : "");
  const [usageLimit, setUsageLimit] = useState(
    existing?.usageLimit != null ? String(existing.usageLimit) : ""
  );
  const [expiryInput, setExpiryInput] = useState(
    existing?.expiresAtIso ? existing.expiresAtIso.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!sellerId || !value.trim()) return;
    const discountValue = parseFloat(value);
    if (Number.isNaN(discountValue) || discountValue <= 0) {
      setError("Enter a valid discount value.");
      return;
    }
    const limitTrim = usageLimit.trim();
    const usageLimitNum = limitTrim === "" ? null : parseInt(limitTrim, 10);
    if (limitTrim !== "" && (Number.isNaN(usageLimitNum) || usageLimitNum! <= 0)) {
      setError("Usage limit must be a positive integer or blank for unlimited.");
      return;
    }
    const expTrim = expiryInput.trim();
    let expiresAtIso: string | null = null;
    if (expTrim) {
      const d = /^\d{4}-\d{2}-\d{2}$/.test(expTrim)
        ? new Date(`${expTrim}T23:59:59.999Z`)
        : new Date(expTrim);
      if (Number.isNaN(d.getTime())) {
        setError("Use expiry as YYYY-MM-DD or leave blank.");
        return;
      }
      expiresAtIso = d.toISOString();
    }

    setSaving(true);
    setError(null);

    if (existing) {
      const res = await updateSellerPromo(existing.id, {
        description: description.trim() || "Bundle offer",
        discount_type: type === "Percentage" ? "percentage" : "fixed",
        discount_value: discountValue,
        usage_limit: usageLimitNum,
        expires_at: expiresAtIso,
        metadata: { bundleLabel: description.trim() || "Bundle offer" },
      });
      setSaving(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
    } else {
      const label = description.trim() || "Bundle offer";
      const res = await createSellerPromo({
        sellerId,
        code: generateCampaignCode("BUNDLE"),
        description: label,
        discountType: type === "Percentage" ? "percentage" : "fixed",
        discountValue,
        usageLimit: usageLimitNum,
        expiresAtIso,
        promoKind: "bundle",
        metadata: { bundleLabel: label },
      });
      setSaving(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
    }

    await onSaved();
    onClose();
  };

  return (
    <View style={styles.campaignSetup}>
      <ThemedText style={styles.formLabel}>Bundle label</ThemedText>
      <TextInput
        style={styles.formInput}
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Wellness starter bundle"
        placeholderTextColor={Colors.light.textMuted}
        testID="input-bundle-label"
      />
      <ThemedText style={styles.formLabel}>Discount type</ThemedText>
      <View style={styles.typeToggle}>
        {(["Percentage", "Fixed"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.typeBtn, type === t && styles.typeBtnActive]}
            onPress={() => setType(t)}
            testID={`bundle-type-${t.toLowerCase()}`}
          >
            <ThemedText style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
              {t === "Percentage" ? "% Off" : "₹ Off"}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <ThemedText style={styles.formLabel}>
        {type === "Percentage" ? "Discount %" : "Discount amount (₹)"}
      </ThemedText>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={setValue}
        placeholder={type === "Percentage" ? "e.g. 10" : "e.g. 200"}
        placeholderTextColor={Colors.light.textMuted}
        keyboardType="decimal-pad"
        testID="input-bundle-discount"
      />
      <ThemedText style={styles.formLabel}>Max uses (blank = unlimited)</ThemedText>
      <TextInput
        style={styles.formInput}
        value={usageLimit}
        onChangeText={setUsageLimit}
        placeholder="e.g. 100"
        placeholderTextColor={Colors.light.textMuted}
        keyboardType="number-pad"
        testID="input-bundle-usage-limit"
      />
      <ThemedText style={styles.formLabel}>Expiry (optional, YYYY-MM-DD)</ThemedText>
      <TextInput
        style={styles.formInput}
        value={expiryInput}
        onChangeText={setExpiryInput}
        placeholder="e.g. 2026-12-31"
        placeholderTextColor={Colors.light.textMuted}
        testID="input-bundle-expiry"
      />
      {error ? <ThemedText style={styles.inlineError}>{error}</ThemedText> : null}
      <View style={styles.campaignSetupActions}>
        <Pressable style={styles.campaignCancelBtn} onPress={onClose} testID="button-bundle-cancel">
          <ThemedText style={styles.campaignCancelText}>Cancel</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.bundleBtn, (!value.trim() || saving || !sellerId) && styles.saveBtnDisabled]}
          onPress={() => void handleSave()}
          disabled={!value.trim() || saving || !sellerId}
          testID="button-bundle-save"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.bundleBtnText}>{existing ? "Save" : "Create"}</ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function CreatePromoForm({
  sellerId,
  onClose,
  onCreated,
}: {
  sellerId: string | null;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"Percentage" | "Fixed">("Percentage");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [usageLimit, setUsageLimit] = useState("100");
  const [expiryInput, setExpiryInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!sellerId || !code.trim() || !value.trim()) return;
    setSaving(true);
    setError(null);
    const limitTrim = usageLimit.trim();
    const usageLimitNum = limitTrim === "" ? null : parseInt(limitTrim, 10);
    if (limitTrim !== "" && (Number.isNaN(usageLimitNum) || usageLimitNum! <= 0)) {
      setError("Usage limit must be a positive integer or blank for unlimited.");
      setSaving(false);
      return;
    }
    const expTrim = expiryInput.trim();
    let expiresAtIso: string | null = null;
    if (expTrim) {
      const d = /^\d{4}-\d{2}-\d{2}$/.test(expTrim)
        ? new Date(`${expTrim}T23:59:59.999Z`)
        : new Date(expTrim);
      if (Number.isNaN(d.getTime())) {
        setError("Use expiry as YYYY-MM-DD or leave blank.");
        setSaving(false);
        return;
      }
      expiresAtIso = d.toISOString();
    }

    const result = await createSellerPromo({
      sellerId,
      code: code.trim(),
      description: description.trim() || undefined,
      discountType: type === "Percentage" ? "percentage" : "fixed",
      discountValue: parseFloat(value) || 0,
      usageLimit: usageLimitNum,
      expiresAtIso,
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    await onCreated();
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  };

  return (
    <View style={styles.createForm}>
      <View style={styles.formHeader}>
        <ThemedText style={styles.formTitle}>Create Promo Code</ThemedText>
        <Pressable onPress={onClose} testID="button-close-form">
          <Feather name="x" size={20} color={Colors.light.textMuted} />
        </Pressable>
      </View>

      {error ? <ThemedText style={styles.inlineError}>{error}</ThemedText> : null}

      <ThemedText style={styles.formLabel}>Code</ThemedText>
      <TextInput
        style={styles.formInput}
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        placeholder="e.g. GRACE25"
        placeholderTextColor={Colors.light.textMuted}
        autoCapitalize="characters"
        testID="input-promo-code"
      />

      <ThemedText style={styles.formLabel}>Description (optional)</ThemedText>
      <TextInput
        style={styles.formInput}
        value={description}
        onChangeText={setDescription}
        placeholder="What this offer applies to"
        placeholderTextColor={Colors.light.textMuted}
      />

      <ThemedText style={styles.formLabel}>Discount Type</ThemedText>
      <View style={styles.typeToggle}>
        {(["Percentage", "Fixed"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.typeBtn, type === t && styles.typeBtnActive]}
            onPress={() => setType(t)}
            testID={`type-${t.toLowerCase()}`}
          >
            <ThemedText style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
              {t === "Percentage" ? "% Off" : "₹ Off"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText style={styles.formLabel}>
        {type === "Percentage" ? "Discount %" : "Discount Amount (₹)"}
      </ThemedText>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={setValue}
        placeholder={type === "Percentage" ? "e.g. 20" : "e.g. 500"}
        placeholderTextColor={Colors.light.textMuted}
        keyboardType="decimal-pad"
        testID="input-promo-value"
      />

      <ThemedText style={styles.formLabel}>Max uses (blank = unlimited)</ThemedText>
      <TextInput
        style={styles.formInput}
        value={usageLimit}
        onChangeText={setUsageLimit}
        placeholder="e.g. 100"
        placeholderTextColor={Colors.light.textMuted}
        keyboardType="number-pad"
        testID="input-usage-limit"
      />

      <ThemedText style={styles.formLabel}>Expiry (optional, YYYY-MM-DD)</ThemedText>
      <TextInput
        style={styles.formInput}
        value={expiryInput}
        onChangeText={setExpiryInput}
        placeholder="e.g. 2026-12-31"
        placeholderTextColor={Colors.light.textMuted}
        testID="input-expiry"
      />

      {saved ? (
        <View style={styles.savedBanner}>
          <Feather name="check-circle" size={16} color="#013220" />
          <ThemedText style={styles.savedText}>Promo code created!</ThemedText>
        </View>
      ) : null}

      <Pressable
        style={[styles.saveBtn, (!code || !value || saving || !sellerId) && styles.saveBtnDisabled]}
        onPress={() => void handleSave()}
        disabled={!code || !value || saving || !sellerId}
        testID="button-save-promo"
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.saveBtnText}>Save Promo Code</ThemedText>
        )}
      </Pressable>
    </View>
  );
}

export default function SellerPromotionsScreen() {
  const { scrollPaddingBottom } = useLayoutInsets(24);
  const { session } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [showFlashSetup, setShowFlashSetup] = useState(false);
  const [showBundleSetup, setShowBundleSetup] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"All" | "Active" | "Expired" | "Paused">("All");
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [rows, setRows] = useState<SellerPromoView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user?.id || !isSupabaseConfigured()) {
      setSellerId(null);
      setRows([]);
      setLoading(false);
      return;
    }
    const sid = await resolveSellerIdByProfileId(session.user.id);
    setSellerId(sid);
    if (!sid) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await listSellerPromos(sid);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setRows([]);
      return;
    }
    setRows(res.rows.map((r) => toSellerPromoDisplay(r)));
  }, [session?.user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const flashCampaign = pickLiveCampaign(rows, "flash_sale");
  const bundleCampaign = pickLiveCampaign(rows, "bundle");
  const standardRows = rows.filter((p) => p.promoKind === "standard");
  const filtered =
    activeFilter === "All" ? standardRows : standardRows.filter((p) => p.status === activeFilter);

  const togglePause = async (p: SellerPromoView) => {
    if (p.dbStatus === "Expired") return;
    const next: SellerPromoRow["status"] = p.dbStatus === "Paused" ? "Active" : "Paused";
    const res = await updateSellerPromo(p.id, { status: next });
    if (!res.ok) {
      Alert.alert("Promo", res.error);
      return;
    }
    await load();
  };

  const remove = async (p: SellerPromoView) => {
    Alert.alert("Delete promo", `Remove ${p.code}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await deleteSellerPromo(p.id);
          if (!res.ok) {
            Alert.alert("Promo", res.error);
            return;
          }
          await load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        variant="action"
        title="Promotions"
        showNotifications={false}
        rightAction={
          <Pressable
            style={styles.addBtn}
            onPress={() => setShowCreate(true)}
            testID="button-create-promo"
          >
            <Feather name="plus" size={20} color={Colors.light.accent} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      >
        {!isSupabaseConfigured() ? (
          <ThemedText style={styles.hintText}>Connect Supabase to manage promo codes.</ThemedText>
        ) : null}

        {isSupabaseConfigured() && session?.user && !sellerId && !loading ? (
          <ThemedText style={styles.hintText}>
            No seller profile is linked to this account. Complete seller onboarding so promos can be saved.
          </ThemedText>
        ) : null}

        {error ? <ThemedText style={styles.inlineError}>{error}</ThemedText> : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.light.accent} />
            <ThemedText style={styles.hintText}>Loading promotions…</ThemedText>
          </View>
        ) : null}

        {showCreate ? (
          <CreatePromoForm sellerId={sellerId} onClose={() => setShowCreate(false)} onCreated={load} />
        ) : null}

        <View style={styles.flashSaleCard}>
          <View style={styles.flashSaleLeft}>
            <Feather name="zap" size={20} color="#D4943A" />
            <View style={styles.campaignTextCol}>
              <ThemedText style={styles.flashTitle}>Flash Sale</ThemedText>
              {flashCampaign ? (
                <>
                  <ThemedText style={styles.flashSub}>
                    {campaignDiscountLabel(flashCampaign)} · {flashCampaign.status} · Code {flashCampaign.code}
                  </ThemedText>
                  <ThemedText style={styles.flashSub}>Ends {flashCampaign.expiry}</ThemedText>
                </>
              ) : (
                <ThemedText style={styles.flashSub}>Run a 24-hour limited offer</ThemedText>
              )}
            </View>
          </View>
          <Pressable
            style={styles.flashBtn}
            testID="button-flash-sale"
            onPress={() => {
              setShowBundleSetup(false);
              setShowFlashSetup((v) => !v);
            }}
          >
            <ThemedText style={styles.flashBtnText}>
              {flashCampaign ? (showFlashSetup ? "Close" : "Manage") : showFlashSetup ? "Close" : "Set Up"}
            </ThemedText>
          </Pressable>
          {flashCampaign && !showFlashSetup ? (
            <View style={styles.campaignInlineActions}>
              {flashCampaign.status !== "Expired" ? (
                <Pressable style={styles.actionBtn} onPress={() => void togglePause(flashCampaign)}>
                  <Feather
                    name={flashCampaign.dbStatus === "Paused" ? "play-circle" : "pause-circle"}
                    size={14}
                    color={Colors.light.accent}
                  />
                  <ThemedText style={styles.actionBtnText}>
                    {flashCampaign.dbStatus === "Paused" ? "Resume" : "Pause"}
                  </ThemedText>
                </Pressable>
              ) : null}
              <Pressable style={styles.actionBtnDanger} onPress={() => void remove(flashCampaign)}>
                <Feather name="trash-2" size={14} color="#8B3A3A" />
                <ThemedText style={styles.actionBtnDangerText}>Delete</ThemedText>
              </Pressable>
            </View>
          ) : null}
          {showFlashSetup ? (
            <FlashCampaignSetup
              sellerId={sellerId}
              existing={flashCampaign}
              onClose={() => setShowFlashSetup(false)}
              onSaved={load}
            />
          ) : null}
        </View>

        <View style={styles.bundleCard}>
          <View style={styles.flashSaleLeft}>
            <Feather name="gift" size={20} color="#7B68EE" />
            <View style={styles.campaignTextCol}>
              <ThemedText style={styles.flashTitle}>Bundle Offer</ThemedText>
              {bundleCampaign ? (
                <>
                  <ThemedText style={styles.flashSub}>
                    {campaignDiscountLabel(bundleCampaign)} · {bundleCampaign.status} · Code {bundleCampaign.code}
                  </ThemedText>
                  <ThemedText style={styles.flashSub}>Expires {bundleCampaign.expiry}</ThemedText>
                </>
              ) : (
                <ThemedText style={styles.flashSub}>Group products at a special price</ThemedText>
              )}
            </View>
          </View>
          <Pressable
            style={styles.bundleBtn}
            testID="button-bundle"
            onPress={() => {
              setShowFlashSetup(false);
              setShowBundleSetup((v) => !v);
            }}
          >
            <ThemedText style={styles.bundleBtnText}>
              {bundleCampaign ? (showBundleSetup ? "Close" : "Manage") : showBundleSetup ? "Close" : "Set Up"}
            </ThemedText>
          </Pressable>
          {bundleCampaign && !showBundleSetup ? (
            <View style={styles.campaignInlineActions}>
              {bundleCampaign.status !== "Expired" ? (
                <Pressable style={styles.actionBtn} onPress={() => void togglePause(bundleCampaign)}>
                  <Feather
                    name={bundleCampaign.dbStatus === "Paused" ? "play-circle" : "pause-circle"}
                    size={14}
                    color={Colors.light.accent}
                  />
                  <ThemedText style={styles.actionBtnText}>
                    {bundleCampaign.dbStatus === "Paused" ? "Resume" : "Pause"}
                  </ThemedText>
                </Pressable>
              ) : null}
              <Pressable style={styles.actionBtnDanger} onPress={() => void remove(bundleCampaign)}>
                <Feather name="trash-2" size={14} color="#8B3A3A" />
                <ThemedText style={styles.actionBtnDangerText}>Delete</ThemedText>
              </Pressable>
            </View>
          ) : null}
          {showBundleSetup ? (
            <BundleCampaignSetup
              sellerId={sellerId}
              existing={bundleCampaign}
              onClose={() => setShowBundleSetup(false)}
              onSaved={load}
            />
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {(["All", "Active", "Paused", "Expired"] as const).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
              testID={`filter-${f.toLowerCase()}`}
            >
              <ThemedText
                style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}
              >
                {f}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {!loading && filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="tag" size={28} color={Colors.light.textMuted} />
            <ThemedText style={styles.emptyTitle}>No promo codes here</ThemedText>
            <ThemedText style={styles.emptySub}>Tap + to create your first promo code</ThemedText>
          </View>
        ) : null}

        {filtered.map((promo) => (
          <PromoCard key={promo.id} promo={promo} onTogglePause={togglePause} onDelete={remove} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hintText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  inlineError: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#8B3A3A",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  container: { flex: 1, backgroundColor: Colors.light.backgroundRoot },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  createForm: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  formLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  formInput: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: `${Colors.light.divider}40`,
  },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.xs,
    padding: 2,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  typeBtnActive: {
    backgroundColor: Colors.light.accent,
  },
  typeBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  typeBtnTextActive: {
    color: "#FFFFFF",
  },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(1,50,32,0.08)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
  },
  savedText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#013220",
  },
  saveBtn: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.xs,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  flashSaleCard: {
    backgroundColor: "rgba(212,148,58,0.08)",
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(212,148,58,0.2)",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  flashSaleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  flashTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  flashSub: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  campaignTextCol: {
    flex: 1,
    gap: 2,
  },
  campaignInlineActions: {
    width: "100%",
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
    marginTop: Spacing.xs,
  },
  campaignSetup: {
    width: "100%",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(212,148,58,0.15)",
  },
  campaignHint: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  campaignSetupActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.sm,
  },
  campaignCancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  campaignCancelText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  flashBtn: {
    backgroundColor: "#D4943A",
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  flashBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  bundleCard: {
    backgroundColor: "rgba(123,104,238,0.06)",
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(123,104,238,0.15)",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  bundleBtn: {
    backgroundColor: "#7B68EE",
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  bundleBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.cardBackground,
  },
  filterChipActive: {
    backgroundColor: Colors.light.accent,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  promoCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  promoTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  promoCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.light.accent}10`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  promoCode: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
  promoDesc: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  promoValueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  promoValue: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  promoExpiry: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  usageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  usageLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    width: 100,
  },
  usageBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: `${Colors.light.accent}15`,
    borderRadius: 2,
    overflow: "hidden",
  },
  usageBar: {
    height: 4,
    backgroundColor: Colors.light.accent,
    borderRadius: 2,
  },
  promoActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.xs,
    backgroundColor: `${Colors.light.accent}14`,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  actionBtnDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.xs,
    backgroundColor: "rgba(139,58,58,0.1)",
  },
  actionBtnDangerText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#8B3A3A",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
  },
});
