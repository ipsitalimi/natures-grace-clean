import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface PromoCode {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number | null;
  usedCount: number;
  usageLimit: number | null;
  validUntil: string;
  status: "Active" | "Expired";
}

const initialPromoCodes: PromoCode[] = [
  {
    id: "p1",
    code: "WELCOME20",
    discountType: "percentage",
    discountValue: 20,
    minOrder: 500,
    usedCount: 89,
    usageLimit: 100,
    validUntil: "Mar 31",
    status: "Active",
  },
  {
    id: "p2",
    code: "HEAL50",
    discountType: "fixed",
    discountValue: 50,
    minOrder: null,
    usedCount: 45,
    usageLimit: null,
    validUntil: "Feb 28",
    status: "Active",
  },
  {
    id: "p3",
    code: "NEWUSER",
    discountType: "percentage",
    discountValue: 15,
    minOrder: 300,
    usedCount: 100,
    usageLimit: 100,
    validUntil: "Jan 31",
    status: "Expired",
  },
];

export default function AdminPromoCodesScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(initialPromoCodes);
  const [showForm, setShowForm] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeCodes = promoCodes.filter((p) => p.status === "Active").length;
  const totalRedeemed = promoCodes.reduce((sum, p) => sum + p.usedCount, 0);

  const handleCreate = () => {
    if (!codeInput.trim() || !discountValue.trim()) return;
    const newCode: PromoCode = {
      id: `p${Date.now()}`,
      code: codeInput.trim().toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      minOrder: minOrder.trim() ? parseFloat(minOrder) : null,
      usedCount: 0,
      usageLimit: usageLimit.trim() ? parseInt(usageLimit) : null,
      validUntil: validUntil.trim() || "Mar 31",
      status: "Active",
    };
    setPromoCodes([newCode, ...promoCodes]);
    setCodeInput("");
    setDiscountValue("");
    setMinOrder("");
    setValidFrom("");
    setValidUntil("");
    setUsageLimit("");
    setShowForm(false);
  };

  const handleToggleStatus = (id: string) => {
    setPromoCodes(
      promoCodes.map((p) =>
        p.id === id ? { ...p, status: p.status === "Active" ? "Expired" as const : "Active" as const } : p
      )
    );
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      setPromoCodes(promoCodes.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
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

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{activeCodes}</ThemedText>
          <ThemedText style={styles.statLabel}>Active Codes</ThemedText>
        </View>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{totalRedeemed}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Redeemed</ThemedText>
        </View>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>Rs. 18,500</ThemedText>
          <ThemedText style={styles.statLabel}>Revenue Saved</ThemedText>
        </View>
      </View>

      {showForm ? (
        <View style={styles.formCard}>
          <ThemedText style={styles.formTitle}>Create Promo Code</ThemedText>

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

          <ThemedText style={styles.inputLabel}>Minimum Order (Rs.)</ThemedText>
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
                placeholder="e.g., Feb 19"
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
                placeholder="e.g., Mar 31"
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
              onPress={() => setShowForm(false)}
              testID="button-cancel-promo"
            >
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </Pressable>
            <Pressable style={styles.createBtn} onPress={handleCreate} testID="button-create-promo">
              <Feather name="plus" size={16} color="#FFFFFF" />
              <ThemedText style={styles.createBtnText}>Create</ThemedText>
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
      {promoCodes.map((promo) => {
        const usagePercent = promo.usageLimit
          ? Math.min((promo.usedCount / promo.usageLimit) * 100, 100)
          : 30;
        const discountLabel =
          promo.discountType === "percentage"
            ? `${promo.discountValue}% off`
            : `Rs. ${promo.discountValue} off`;
        const usageLabel = promo.usageLimit
          ? `${promo.usedCount}/${promo.usageLimit}`
          : `${promo.usedCount}/unlimited`;

        return (
          <View key={promo.id} style={styles.promoCard}>
            <View style={styles.promoHeader}>
              <ThemedText style={styles.promoCode}>{promo.code}</ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  promo.status === "Active" ? styles.statusActive : styles.statusExpired,
                ]}
              >
                <ThemedText style={styles.statusBadgeText}>{promo.status}</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.promoDiscount}>{discountLabel}</ThemedText>
            {promo.minOrder ? (
              <ThemedText style={styles.promoMeta}>Min order: Rs. {promo.minOrder}</ThemedText>
            ) : (
              <ThemedText style={styles.promoMeta}>No minimum order</ThemedText>
            )}
            <ThemedText style={styles.promoMeta}>Valid until {promo.validUntil}</ThemedText>

            <View style={styles.usageSection}>
              <ThemedText style={styles.usageLabel}>Used: {usageLabel}</ThemedText>
              <View style={styles.usageBarWrapper}>
                <View style={[styles.usageBar, { width: `${usagePercent}%` }]} />
              </View>
            </View>

            <View style={styles.promoActions}>
              <Pressable
                style={[styles.toggleStatusBtn, promo.status === "Active" ? styles.deactivateBtn : styles.activateBtn]}
                onPress={() => handleToggleStatus(promo.id)}
                testID={`button-toggle-promo-${promo.id}`}
              >
                <Feather
                  name={promo.status === "Active" ? "pause-circle" : "play-circle"}
                  size={14}
                  color={promo.status === "Active" ? "#8B3A3A" : Colors.light.accent}
                />
                <ThemedText
                  style={[
                    styles.toggleStatusText,
                    promo.status === "Active" ? styles.deactivateText : styles.activateText,
                  ]}
                >
                  {promo.status === "Active" ? "Deactivate" : "Activate"}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.deleteBtn, confirmDeleteId === promo.id ? styles.deleteBtnConfirm : null]}
                onPress={() => handleDelete(promo.id)}
                testID={`button-delete-promo-${promo.id}`}
              >
                <Feather
                  name="trash-2"
                  size={14}
                  color={confirmDeleteId === promo.id ? "#FFFFFF" : "#8B3A3A"}
                />
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
    marginBottom: Spacing.lg,
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
