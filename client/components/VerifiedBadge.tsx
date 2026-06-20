import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

type VerifiedKind = "practitioner" | "seller";

const LABELS: Record<VerifiedKind, string> = {
  practitioner: "Verified Practitioner",
  seller: "Verified Seller",
};

export default function VerifiedBadge({
  kind,
  compact,
}: {
  kind: VerifiedKind;
  compact?: boolean;
}) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Feather name="check-circle" size={compact ? 12 : 14} color="#2E7D32" />
      <ThemedText style={[styles.text, compact && styles.textCompact]}>{LABELS[kind]}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
  },
  textCompact: {
    fontSize: 10,
  },
});

export function isVerifiedPractitioner(p: {
  approvalStatus?: string;
  isVerified?: boolean;
}): boolean {
  return p.approvalStatus === "Approved" && p.isVerified === true;
}

export function isVerifiedSeller(seller: { isVerified?: boolean; is_active?: boolean }): boolean {
  return seller.isVerified === true && seller.is_active !== false;
}
