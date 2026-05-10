import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { sellerStats, walletTransactions, type WalletTransaction } from "@/data/sellerMockData";

function TransactionRow({ txn }: { txn: WalletTransaction }) {
  const isCredit = txn.type === "credit";
  return (
    <View style={styles.txnRow} testID={`txn-${txn.id}`}>
      <View style={[styles.txnIconBg, { backgroundColor: isCredit ? "rgba(1,50,32,0.08)" : "rgba(139,58,58,0.08)" }]}>
        <Feather
          name={isCredit ? "arrow-down-left" : "arrow-up-right"}
          size={16}
          color={isCredit ? "#013220" : "#8B3A3A"}
        />
      </View>
      <View style={styles.txnInfo}>
        <ThemedText style={styles.txnDesc} numberOfLines={1}>{txn.description}</ThemedText>
        <ThemedText style={styles.txnDate}>{txn.date}</ThemedText>
      </View>
      <ThemedText style={[styles.txnAmount, { color: isCredit ? "#013220" : "#8B3A3A" }]}>
        {isCredit ? "+" : "-"}Rs. {txn.amount.toLocaleString()}
      </ThemedText>
    </View>
  );
}

export default function SellerWalletScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Wallet & Earnings</ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.balanceCard}>
          <ThemedText style={styles.balanceLabel}>Available Balance</ThemedText>
          <ThemedText style={styles.balanceAmount}>
            Rs. {sellerStats.walletBalance.toLocaleString()}
          </ThemedText>
          <Pressable style={styles.withdrawBtn} testID="button-withdraw">
            <Feather name="arrow-up-right" size={16} color="#FFFFFF" />
            <ThemedText style={styles.withdrawBtnText}>Withdraw to Bank</ThemedText>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Feather name="clock" size={18} color="#D4943A" />
            <ThemedText style={styles.summaryValue}>
              Rs. {sellerStats.pendingPayout.toLocaleString()}
            </ThemedText>
            <ThemedText style={styles.summaryLabel}>Pending Payout</ThemedText>
          </View>
          <View style={styles.summaryCard}>
            <Feather name="trending-up" size={18} color="#4A5A2B" />
            <ThemedText style={styles.summaryValue}>
              Rs. {sellerStats.revenue.toLocaleString()}
            </ThemedText>
            <ThemedText style={styles.summaryLabel}>Total Earned</ThemedText>
          </View>
        </View>

        <View style={styles.payoutInfoCard}>
          <View style={styles.payoutRow}>
            <Feather name="calendar" size={16} color={Colors.light.accent} />
            <View style={styles.payoutText}>
              <ThemedText style={styles.payoutLabel}>Next Payout Date</ThemedText>
              <ThemedText style={styles.payoutValue}>15 May 2026</ThemedText>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.payoutRow}>
            <Feather name="credit-card" size={16} color={Colors.light.accent} />
            <View style={styles.payoutText}>
              <ThemedText style={styles.payoutLabel}>Linked Bank Account</ThemedText>
              <ThemedText style={styles.payoutValue}>HDFC Bank  ····  4821</ThemedText>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.payoutRow}>
            <Feather name="percent" size={16} color={Colors.light.accent} />
            <View style={styles.payoutText}>
              <ThemedText style={styles.payoutLabel}>Platform Commission</ThemedText>
              <ThemedText style={styles.payoutValue}>10% per order</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={[styles.sectionTitle, { marginBottom: Spacing.md }]}>
            Transaction History
          </ThemedText>
          {walletTransactions.map((txn) => (
            <TransactionRow key={txn.id} txn={txn} />
          ))}
        </View>
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
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  balanceCard: {
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  balanceAmount: {
    fontSize: 36,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  withdrawBtnText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    alignItems: "center",
    gap: 6,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
  },
  payoutInfoCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  payoutText: { flex: 1 },
  payoutLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  payoutValue: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  divider: {
    height: 1,
    backgroundColor: `${Colors.light.divider}25`,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}20`,
  },
  txnIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  txnInfo: {
    flex: 1,
    gap: 2,
  },
  txnDesc: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  txnDate: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  txnAmount: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
});
