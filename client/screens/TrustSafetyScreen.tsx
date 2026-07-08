import React from "react";
import { StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import type { LegalDocumentKey } from "@/types/legal";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <PageLayout
      title="Trust & Safety"
      titleInHeader
      header="back"
      contentContainerStyle={styles.content}
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
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: LayoutSpacing.xs,
    gap: 10,
  },
  intro: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 21,
    marginBottom: LayoutSpacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: LayoutSpacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  rowLabel: { fontSize: 15, color: Colors.light.text, flex: 1, paddingRight: LayoutSpacing.sm },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: LayoutSpacing.sm,
    marginTop: LayoutSpacing.md,
    padding: LayoutSpacing.md,
  },
  supportText: { fontSize: 14, fontWeight: "600", color: Colors.light.accent },
});
