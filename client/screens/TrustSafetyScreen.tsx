import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { LegalDocumentKey } from "@/types/legal";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";

const LINKS: { key: LegalDocumentKey; label: string }[] = [
  { key: "user_terms", label: "Terms & Conditions" },
  { key: "privacy_policy", label: "Privacy Policy" },
  { key: "refund_policy", label: "Refund Policy" },
  { key: "medical_disclaimer", label: "Medical Disclaimer" },
  { key: "shipping_policy", label: "Shipping Policy" },
  { key: "account_deletion_policy", label: "Account Deletion" },
  { key: "community_guidelines", label: "Community Guidelines" },
  { key: "practitioner_agreement", label: "Practitioner Agreement" },
  { key: "seller_agreement", label: "Seller Agreement" },
  { key: "grievance_policy", label: "Contact & Grievance" },
];

export default function TrustSafetyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Trust & Safety</ThemedText>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: getScrollBottomPadding(insets.bottom, 24) },
        ]}
      >
        <ThemedText style={styles.intro}>
          Your safety matters. Review our policies, report concerns, and understand how Nature's Grace
          operates as a wellness marketplace.
        </ThemedText>

        {LINKS.map((link) => (
          <Pressable
            key={link.key}
            style={styles.row}
            onPress={() => navigation.navigate("LegalDocument", { docKey: link.key })}
          >
            <ThemedText style={styles.rowLabel}>{link.label}</ThemedText>
            <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
          </Pressable>
        ))}

        <Pressable style={styles.supportRow} onPress={() => navigation.navigate("Support")}>
          <Feather name="life-buoy" size={18} color={Colors.light.accent} />
          <ThemedText style={styles.supportText}>Get help or file a grievance</ThemedText>
        </Pressable>
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
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  intro: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  rowLabel: { fontSize: 15, fontWeight: "500", color: Colors.light.text },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: "rgba(1, 50, 32, 0.06)",
    borderRadius: BorderRadius.sm,
  },
  supportText: { fontSize: 14, fontWeight: "600", color: Colors.light.accent },
});
