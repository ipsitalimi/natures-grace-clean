import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";

type TrustKind = "practitioner" | "seller";

const PRACTITIONER_ITEMS = [
  "Identity Verified",
  "Certifications Reviewed",
  "Approved by Nature's Grace",
] as const;

const SELLER_ITEMS = ["Identity Verified", "Store Approved", "Verified Seller"] as const;

export default function TrustIndicators({ kind }: { kind: TrustKind }) {
  const items = kind === "practitioner" ? PRACTITIONER_ITEMS : SELLER_ITEMS;
  return (
    <View style={styles.container}>
      {items.map((label) => (
        <View key={label} style={styles.row}>
          <Feather name="check" size={14} color={Colors.light.accent} />
          <ThemedText style={styles.label}>{label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
