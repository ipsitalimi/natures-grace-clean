import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { formatInr, formatInrOff } from "@/lib/formatCurrency";
import {
  createPlatformPromoCode,
  deletePlatformPromoCode,
  listPlatformPromoCodes,
  rowToAdminPromoCode,
  updatePlatformPromoCode,
  type AdminPromoDisplay,
} from "@/services/commerce/platformPromosService";

function badgeStyles(displayStatus: AdminPromoDisplay["displayStatus"]) {
  switch (displayStatus) {
    case "Active":
      return styles.statusActive;
    case "Paused":
      return styles.statusPaused;
    default:
      return styles.statusExpired;
  }
}

/** Parse optional YYYY-MM-DD to ISO boundaries (UTC). */
function parseStartsAt(trimmed: string): string | null {
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return `${trimmed}T00:00:00.000Z`;
}

function parseExpiresAt(trimmed: string): string | null {
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return `${trimmed}T23:59:59.999Z`;
}

export default function AdminPromoCodesScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const { logActivity } = usePlatformConfig();
  const [promoCodes, setPromoCodes] = useState<AdminPromoDisplay[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [listError, setListError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setPromoCodes([]);
      setListError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setListError(null);
    const res = await listPlatformPromoCodes();
    setLoading(false);
    if (!res.ok) {
      setListError(res.error);
      setPromoCodes([]);
      return;
    }
    setPromoCodes(res.rows.map(rowToAdminPromoCode));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCodes = promoCodes.filter((p) => p.displayStatus === "Active").length;
  const pausedCodes = promoCodes.filter((p) => p.displayStatus === "Paused").length;
  const totalRedeemed = promoCodes.reduce((sum, p) => sum + p.usedCount, 0);
  const estFixedSavings = promoCodes.reduce(
    (s, p) => (p.discountType === "fixed" ? s + p.usedCount * p.discountValue : s),
    0
  );

  const handleCreate = async () => {
    if (!codeInput.trim() || !discountValue.trim()) return;
    setCreateError(null);
    const vf = validFrom.trim();
    const vu = validUntil.trim();

    if ((vf && !/^\d{4}-\d{2}-\d{2}$/.test(vf)) || (vu && !/^\d{4}-\d{2}-\d{2}$/.test(vu))) {
      setCreateError("Use Valid From / Until as YYYY-MM-DD or leave empty.");
      return;
    }

    const limitTrim = usageLimit.trim();
    const usageLimitNum = limitTrim === "" ? null : parseInt(limitTrim, 10);
    if (limitTrim !== "" && (Number.isNaN(usageLimitNum) || usageLimitNum! <= 0)) {
      setCreateError("Usage limit must be a positive integer or blank for unlimited.");
      return;
    }

    setCreateBusy(true);
    const res = await createPlatformPromoCode({
      code: codeInput.trim(),
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      minOrder: minOrder.trim() ? parseFloat(minOrder) : null,
      usageLimit: usageLimitNum,
      startsAtIso: parseStartsAt(vf),
      expiresAtIso: parseExpiresAt(vu),
    });
    setCreateBusy(false);
    if (!res.ok) {
      setCreateError(res.error);
      return;
    }

    logActivity(`Global promo ${res.row.code} created`, "store");
    setCodeInput("");
    setDiscountValue("");
    setMinOrder("");
    setValidFrom("");
    setValidUntil("");
    setUsageLimit("");
    setShowForm(false);
    await load();
  };

  const handleToggleStatus = async (id: string) => {
    const promo = promoCodes.find((p) => p.id === id);
    if (!promo || !promo.canToggle) return;
    const next: "Active" | "Paused" = promo.dbStatus === "Active" ? "Paused" : "Active";
    const res = await updatePlatformPromoCode(id, { status: next });
    if (!res.ok) {
      Alert.alert("Promo", res.error);
      return;
    }
    logActivity(`Global promo ${promo.code} set ${next}`, "store");
    await load();
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      const code = promoCodes.find((p) => p.id === id)?.code ?? id;
      void (async () => {
        const res = await deletePlatformPromoCode(id);
        setConfirmDeleteId(null);
        if (!res.ok) {
          Alert.alert("Promo", res.error);
          return;
        }
        logActivity(`Global promo ${code} deleted`, "store");
        await load();
      })();
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard} testID="button-back-dashboard">
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Promo Codes</ThemedText>
      </View>

      {!isSupabaseConfigured() ? (
        <ThemedText style={styles.hint}>Connect Supabase to manage global promo codes.</ThemedText>
      ) : null}

      {listError ? <ThemedText style={styles.errorBanner}>{listError}</ThemedText> : null}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.hint}>Loading promo codes…</ThemedText>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{activeCodes}</ThemedText>
          <ThemedText style={styles.statLabel}>Active Codes</ThemedText>
        </View>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{totalRedeemed}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Redemptions</ThemedText>
        </View>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{formatInr(Math.round(estFixedSavings))}+</ThemedText>
          <ThemedText style={styles.statLabel}>Est. Fixed Off</ThemedText>
        </View>
      </View>

      <View style={styles.statRowSecond}>
        <ThemedText style={styles.hint}>Paused: {pausedCodes}</ThemedText>
      </View>

      {showForm ? (
        <View style={styles.formCard}>
          <ThemedText style={styles.formTitle}>Create Promo Code</ThemedText>

          {createError ? <ThemedText style={styles.errorBanner}>{createError}</ThemedText> : null}

          <ThemedText style={styles.inputLabel}>Code</ThemedText>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={codeInput}
            onChangeText={(text) => setCodeInput(text.toUpperCase())}
            placeholder="e.g., SUMMER25"
            placeholderTextColor={`${Colors.light.textSecondary}80`}
            autoCapitalize="characters"
            testID="input-promo-code"
          />

          <ThemedText style={styles.inputLabel}>Discount Type</ThemedText>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleButton, discountType === "percentage" ? styles.toggleButtonActive : null]}
              onPress={() => setDiscountType("percentage")}
              testID="button-type-percentage"
            >
              <ThemedText
                style={[styles.toggleButtonText, discountType === "percentage" ? styles.toggleButtonTextActive : null]}
              >
                Percentage
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, discountType === "fixed" ? styles.toggleButtonActive : null]}
              onPress={() => setDiscountType("fixed")}
              testID="button-type-fixed"
            >
              <ThemedText
                style={[styles.toggleButtonText, discountType === "fixed" ? styles.toggleButtonTextActive : null]}
              >
                Fixed Amount
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText style={styles.inputLabel}>Discount Value</ThemedText>
          <TextInput
            style={styles.input}
            value={discountValue}
            onChangeText={setDiscountValue}
            placeholder={discountType === "percentage" ? "e.g., 20" : "e.g., 50"}
            placeholderTextColor={`${Colors.light.textSecondary}80`}
            keyboardType="numeric"
            testID="input-discount-value"
          />

          <ThemedText style={styles.inputLabel}>Minimum Order (₹)</ThemedText>
          <TextInput
            style={styles.input}
            value={minOrder}
            onChangeText={setMinOrder}
            placeholder="Leave empty for no minimum"
            placeholderTextColor={`${Colors.light.textSecondary}80`}
            keyboardType="numeric"
            testID="input-min-order"
          />

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <ThemedText style={styles.inputLabel}>Valid From</ThemedText>
              <TextInput
                style={styles.input}
                value={validFrom}
                onChangeText={setValidFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={`${Colors.light.textSecondary}80`}
                testID="input-valid-from"
              />
            </View>
            <View style={styles.dateField}>
              <ThemedText style={styles.inputLabel}>Valid Until</ThemedText>
              <TextInput
                style={styles.input}
                value={validUntil}
                onChangeText={setValidUntil}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={`${Colors.light.textSecondary}80`}
                testID="input-valid-until"
              />
            </View>
          </View>

          <ThemedText style={styles.inputLabel}>Usage Limit</ThemedText>
          <TextInput
            style={styles.input}
            value={usageLimit}
            onChangeText={setUsageLimit}
            placeholder="Leave empty for unlimited"
            placeholderTextColor={`${Colors.light.textSecondary}80`}
            keyboardType="numeric"
            testID="input-usage-limit"
          />

          <View style={styles.formActions}>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                setShowForm(false);
                setCreateError(null);
              }}
              testID="button-cancel-promo"
            >
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.createBtn, createBusy && styles.createBtnDisabled]}
              onPress={() => void handleCreate()}
              disabled={createBusy}
              testID="button-create-promo"
            >
              {createBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.createBtnText}>Create</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.addButton}
          onPress={() => setShowForm(true)}
          testID="button-new-promo"
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <ThemedText style={styles.addButtonText}>Create Promo Code</ThemedText>
        </Pressable>
      )}

      <ThemedText style={styles.subSectionTitle}>Existing Codes</ThemedText>
      {!loading && promoCodes.length === 0 ? (
        <ThemedText style={styles.hint}>No global promo codes yet. Create one above.</ThemedText>
      ) : null}
      {promoCodes.map((promo) => {
        const usagePercent =
          promo.usageLimit != null
            ? Math.min((promo.usedCount / promo.usageLimit) * 100, 100)
            : promo.usedCount > 0
              ? 100
              : 10;
        const discountLabel =
          promo.discountType === "percentage"
            ? `${promo.discountValue}% off`
            : formatInrOff(promo.discountValue);
        const usageLabel =
          promo.usageLimit != null
            ? `${promo.usedCount}/${promo.usageLimit}`
            : `${promo.usedCount}/unlimited`;

        return (
          <View key={promo.id} style={styles.promoCard}>
            <View style={styles.promoHeader}>
              <ThemedText style={styles.promoCode}>{promo.code}</ThemedText>
              <View style={[styles.statusBadge, badgeStyles(promo.displayStatus)]}>
                <ThemedText style={styles.statusBadgeText}>{promo.displayStatus}</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.promoDiscount}>{discountLabel}</ThemedText>
            {promo.minOrder ? (
              <ThemedText style={styles.promoMeta}>Min order: {formatInr(promo.minOrder)}</ThemedText>
            ) : (
              <ThemedText style={styles.promoMeta}>No minimum order</ThemedText>
            )}
            <ThemedText style={styles.promoMeta}>Valid from {promo.validFrom}</ThemedText>
            <ThemedText style={styles.promoMeta}>Valid until {promo.validUntil}</ThemedText>

            <View style={styles.usageSection}>
              <ThemedText style={styles.usageLabel}>Used: {usageLabel}</ThemedText>
              <View style={styles.usageBarWrapper}>
                <View style={[styles.usageBar, { width: `${usagePercent}%` }]} />
              </View>
            </View>

            <View style={styles.promoActions}>
              {promo.canToggle ? (
                <Pressable
                  style={[styles.toggleStatusBtn, promo.displayStatus === "Active" ? styles.deactivateBtn : styles.activateBtn]}
                  onPress={() => void handleToggleStatus(promo.id)}
                  testID={`button-toggle-promo-${promo.id}`}
                >
                  <Feather
                    name={promo.displayStatus === "Active" ? "pause-circle" : "play-circle"}
                    size={14}
                    color={promo.displayStatus === "Active" ? "#8B3A3A" : Colors.light.accent}
                  />
                  <ThemedText
                    style={[
                      styles.toggleStatusText,
                      promo.displayStatus === "Active" ? styles.deactivateText : styles.activateText,
                    ]}
                  >
                    {promo.displayStatus === "Active" ? "Deactivate" : "Activate"}
                  </ThemedText>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable
                style={[styles.deleteBtn, confirmDeleteId === promo.id ? styles.deleteBtnConfirm : null]}
                onPress={() => handleDelete(promo.id)}
                testID={`button-delete-promo-${promo.id}`}
              >
                <Feather name="trash-2" size={14} color={confirmDeleteId === promo.id ? "#FFFFFF" : "#8B3A3A"} />
                {confirmDeleteId === promo.id ? (
                  <ThemedText style={styles.deleteBtnConfirmText}>Confirm</ThemedText>
                ) : null}
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorBanner: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#8B3A3A",
    marginBottom: Spacing.md,
  },
  statRowSecond: {
    marginBottom: Spacing.md,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: Spacing.sm,
  },
  statChip: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  formCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  codeInput: {
    fontFamily: "Nunito_700Bold",
    letterSpacing: 2,
  },
  toggleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: Colors.light.accent,
  },
  toggleButtonText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  toggleButtonTextActive: {
    color: "#FFFFFF",
  },
  dateRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dateField: {
    flex: 1,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontFamily: "Nunito_400Regular",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 6,
    minWidth: 110,
    justifyContent: "center",
  },
  createBtnDisabled: {
    opacity: 0.65,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  promoCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  promoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  promoCode: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    letterSpacing: 1.5,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusActive: {
    backgroundColor: "#013220",
  },
  statusPaused: {
    backgroundColor: "#D4943A",
  },
  statusExpired: {
    backgroundColor: "#AAB494",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  promoDiscount: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  promoMeta: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  usageSection: {
    marginTop: 8,
    gap: 4,
  },
  usageLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  usageBarWrapper: {
    height: 6,
    backgroundColor: `${Colors.light.accent}15`,
    borderRadius: 3,
  },
  usageBar: {
    height: 6,
    backgroundColor: Colors.light.accent,
    borderRadius: 3,
  },
  promoActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  toggleStatusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  deactivateBtn: {
    borderColor: "#8B3A3A",
  },
  activateBtn: {
    borderColor: Colors.light.accent,
  },
  toggleStatusText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
  },
  deactivateText: {
    color: "#8B3A3A",
  },
  activateText: {
    color: Colors.light.accent,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
    borderRadius: 8,
  },
  deleteBtnConfirm: {
    backgroundColor: "#C47A7A",
    paddingHorizontal: 10,
  },
  deleteBtnConfirmText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
  },
});
