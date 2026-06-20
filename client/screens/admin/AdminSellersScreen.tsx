import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useDataContext } from "@/context/DataContext";

export default function AdminSellersScreen({
  onBackToDashboard,
}: {
  onBackToDashboard: () => void;
}) {
  const { users, updateUser, settings } = usePlatformConfig();
  const { sellerCatalog } = useDataContext();
  const sellers = users.filter((u) => u.role === "Seller");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard}>
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Sellers</ThemedText>
      </View>

      <View style={styles.infoCard}>
        <Feather name="inbox" size={16} color={Colors.light.accent} />
        <ThemedText style={styles.infoText}>
          Pending seller applications are reviewed under Applications, not here. This screen lists
          accounts already approved as sellers.
        </ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{sellers.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Seller accounts</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{sellerCatalog.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Catalog items</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{settings.commissionRate}%</ThemedText>
          <ThemedText style={styles.statLabel}>Commission</ThemedText>
        </View>
      </View>

      {sellers.length === 0 ? (
        <View style={styles.emptyCard}>
          <ThemedText style={styles.empty}>
            No seller accounts. Change a user&apos;s role to Seller in Users.
          </ThemedText>
        </View>
      ) : (
        sellers.map((seller) => (
          <View key={seller.id} style={styles.card}>
            <View style={styles.cardTop}>
              <ThemedText style={styles.name}>{seller.name}</ThemedText>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      seller.status === "Active" ? "#013220" : "#8B3A3A",
                  },
                ]}
              >
                <ThemedText style={styles.badgeText}>{seller.status}</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.email}>{seller.email}</ThemedText>
            <ThemedText style={styles.meta}>Joined {seller.joinedDate}</ThemedText>
            <View style={styles.actions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() =>
                  updateUser(seller.id, {
                    status: seller.status === "Suspended" ? "Active" : "Suspended",
                  })
                }
              >
                <ThemedText style={styles.actionText}>
                  {seller.status === "Suspended" ? "Activate" : "Suspend"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: Spacing.lg, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.lg },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textSecondary,
  },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: Spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: 12,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  statLabel: { fontSize: 11, color: Colors.light.textSecondary, textAlign: "center" },
  emptyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  empty: { color: Colors.light.textSecondary, textAlign: "center", lineHeight: 18 },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  email: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 4 },
  meta: { fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#FFF", fontSize: 11, fontWeight: "600" },
  actions: { flexDirection: "row", marginTop: 10, gap: 8 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundRoot,
  },
  actionText: { fontSize: 13, fontWeight: "600", color: Colors.light.accent },
});
