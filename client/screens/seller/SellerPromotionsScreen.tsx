import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { sellerPromos, type SellerPromo } from "@/data/sellerMockData";

function PromoCard({ promo }: { promo: SellerPromo }) {
  const statusColor =
    promo.status === "Active"
      ? { bg: "rgba(1,50,32,0.08)", text: "#013220" }
      : promo.status === "Paused"
      ? { bg: "rgba(212,148,58,0.12)", text: "#B8860B" }
      : { bg: "rgba(139,58,58,0.08)", text: "#8B3A3A" };

  const usagePct = (promo.usageCount / promo.usageLimit) * 100;

  return (
    <View style={styles.promoCard} testID={`promo-card-${promo.id}`}>
      <View style={styles.promoTopRow}>
        <View style={styles.promoCodeBadge}>
          <Feather name="tag" size={12} color={Colors.light.accent} />
          <ThemedText style={styles.promoCode}>{promo.code}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <ThemedText style={[styles.statusText, { color: statusColor.text }]}>
            {promo.status}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.promoDesc}>{promo.description}</ThemedText>

      <View style={styles.promoValueRow}>
        <ThemedText style={styles.promoValue}>
          {promo.type === "Percentage" ? `${promo.value}% OFF` : `Rs. ${promo.value} OFF`}
        </ThemedText>
        <ThemedText style={styles.promoExpiry}>Expires {promo.expiry}</ThemedText>
      </View>

      <View style={styles.usageRow}>
        <ThemedText style={styles.usageLabel}>
          {promo.usageCount}/{promo.usageLimit} used
        </ThemedText>
        <View style={styles.usageBarTrack}>
          <View style={[styles.usageBar, { width: `${usagePct}%` }]} />
        </View>
      </View>
    </View>
  );
}

function CreatePromoForm({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"Percentage" | "Fixed">("Percentage");
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!code || !value) return;
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <View style={styles.createForm}>
      <View style={styles.formHeader}>
        <ThemedText style={styles.formTitle}>Create Promo Code</ThemedText>
        <Pressable onPress={onClose} testID="button-close-form">
          <Feather name="x" size={20} color={Colors.light.textMuted} />
        </Pressable>
      </View>

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
              {t === "Percentage" ? "% Off" : "Rs. Off"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText style={styles.formLabel}>
        {type === "Percentage" ? "Discount %" : "Discount Amount (Rs.)"}
      </ThemedText>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={setValue}
        placeholder={type === "Percentage" ? "e.g. 20" : "e.g. 500"}
        placeholderTextColor={Colors.light.textMuted}
        keyboardType="number-pad"
        testID="input-promo-value"
      />

      {saved ? (
        <View style={styles.savedBanner}>
          <Feather name="check-circle" size={16} color="#013220" />
          <ThemedText style={styles.savedText}>Promo code created!</ThemedText>
        </View>
      ) : null}

      <Pressable
        style={[styles.saveBtn, (!code || !value) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!code || !value}
        testID="button-save-promo"
      >
        <ThemedText style={styles.saveBtnText}>Save Promo Code</ThemedText>
      </Pressable>
    </View>
  );
}

export default function SellerPromotionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [showCreate, setShowCreate] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"All" | "Active" | "Expired" | "Paused">("All");

  const filtered =
    activeFilter === "All" ? sellerPromos : sellerPromos.filter((p) => p.status === activeFilter);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Promotions</ThemedText>
        <Pressable
          style={styles.addBtn}
          onPress={() => setShowCreate(true)}
          testID="button-create-promo"
        >
          <Feather name="plus" size={20} color={Colors.light.accent} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        {showCreate ? (
          <CreatePromoForm onClose={() => setShowCreate(false)} />
        ) : null}

        <View style={styles.flashSaleCard}>
          <View style={styles.flashSaleLeft}>
            <Feather name="zap" size={20} color="#D4943A" />
            <View>
              <ThemedText style={styles.flashTitle}>Flash Sale</ThemedText>
              <ThemedText style={styles.flashSub}>Run a 24-hour limited offer</ThemedText>
            </View>
          </View>
          <Pressable style={styles.flashBtn} testID="button-flash-sale">
            <ThemedText style={styles.flashBtnText}>Set Up</ThemedText>
          </Pressable>
        </View>

        <View style={styles.bundleCard}>
          <View style={styles.flashSaleLeft}>
            <Feather name="gift" size={20} color="#7B68EE" />
            <View>
              <ThemedText style={styles.flashTitle}>Bundle Offer</ThemedText>
              <ThemedText style={styles.flashSub}>Group products at a special price</ThemedText>
            </View>
          </View>
          <Pressable style={styles.bundleBtn} testID="button-bundle">
            <ThemedText style={styles.bundleBtnText}>Set Up</ThemedText>
          </Pressable>
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

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="tag" size={28} color={Colors.light.textMuted} />
            <ThemedText style={styles.emptyTitle}>No promo codes here</ThemedText>
            <ThemedText style={styles.emptySub}>Tap + to create your first promo code</ThemedText>
          </View>
        ) : null}

        {filtered.map((promo) => (
          <PromoCard key={promo.id} promo={promo} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundRoot },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
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
    width: 80,
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
