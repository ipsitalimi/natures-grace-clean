import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { PractitionerWalletTransaction } from "@/data/practitionerBookings";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { useAuth } from "@/context/AuthContext";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import BankDetailsCard from "@/components/wallet/BankDetailsCard";
import { updatePractitionerBankDetails } from "@/services/walletLedgerApi";
import { formatInr, formatInrSigned } from "@/lib/formatCurrency";
import {
  BANK_NOT_LINKED_NOTICE,
  isBankAccountLinked,
  MANUAL_PAYOUT_NOTICE,
} from "@/lib/payoutDisclosure";

function TransactionRow({ txn }: { txn: PractitionerWalletTransaction }) {
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
        {formatInrSigned(isCredit ? txn.amount : -txn.amount)}
      </ThemedText>
    </View>
  );
}

export default function PractitionerWalletScreen() {
  const { scrollPaddingBottom } = useLayoutInsets(24);
  const { snapshot, requestPayout, loading, loadError, refresh } = usePractitionerContext();
  const { session } = useAuth();
  const [withdrawing, setWithdrawing] = useState(false);

  const bankLinked = isBankAccountLinked(snapshot.bankAccountLabel);

  const handleWithdraw = async () => {
    if (!bankLinked) {
      Alert.alert("Bank details required", BANK_NOT_LINKED_NOTICE);
      return;
    }
    if (snapshot.availableBalance <= 0) {
      Alert.alert("No balance", "There is no available balance to withdraw yet.");
      return;
    }
    setWithdrawing(true);
    const result = await requestPayout();
    setWithdrawing(false);
    if (result.error) {
      Alert.alert("Withdrawal", result.error);
      return;
    }
    const body =
      result.message ??
      "Your withdrawal request was received. The Nature's Grace team processes requests manually within 3–7 business days.";
    Alert.alert("Withdrawal requested", body);
  };

  return (
    <View style={styles.container}>
      <BackHeader showNotifications={false} />
      <BelowHeaderTitle>Wallet & Earnings</BelowHeaderTitle>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      >
        {loading ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator color={Colors.light.accent} />
            <ThemedText style={styles.stateText}>Loading wallet…</ThemedText>
          </View>
        ) : loadError ? (
          <View style={styles.stateBlock}>
            <Feather name="alert-circle" size={24} color={Colors.light.textMuted} />
            <ThemedText style={styles.stateText}>{loadError}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={() => void refresh()}>
              <ThemedText style={styles.retryBtnText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
        <View style={styles.disclosureCard}>
          <Feather name="info" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.disclosureText}>{MANUAL_PAYOUT_NOTICE}</ThemedText>
        </View>

        <BankDetailsCard
          bankAccountLabel={snapshot.bankAccountLabel}
          onSave={async (input) => {
            if (!session?.access_token) {
              return { error: "Sign in to save bank details." };
            }
            const result = await updatePractitionerBankDetails(input, session.access_token);
            if (result.error) return result;
            await refresh();
            return {};
          }}
        />

        <View style={styles.balanceCard}>
          <ThemedText style={styles.balanceLabel}>Available Balance</ThemedText>
          <ThemedText
            style={styles.balanceAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {formatInr(snapshot.availableBalance)}
          </ThemedText>
          <Pressable
            style={[styles.withdrawBtn, !bankLinked && styles.withdrawBtnDisabled]}
            testID="button-withdraw"
            onPress={handleWithdraw}
            disabled={withdrawing || !bankLinked}
          >
            <Feather name="arrow-up-right" size={16} color="#FFFFFF" />
            <ThemedText style={styles.withdrawBtnText}>
              {bankLinked ? "Request withdrawal" : "Bank details required"}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Feather name="clock" size={18} color="#D4943A" />
            <ThemedText style={styles.summaryValue}>
              {formatInr(snapshot.pendingPayout)}
            </ThemedText>
            <ThemedText style={styles.summaryLabel}>
              Pending Payout{snapshot.activePayoutCount > 0 ? ` (${snapshot.activePayoutCount})` : ""}
            </ThemedText>
          </View>
          <View style={styles.summaryCard}>
            <Feather name="trending-up" size={18} color="#4A5A2B" />
            <ThemedText style={styles.summaryValue}>
              {formatInr(snapshot.totalEarned)}
            </ThemedText>
            <ThemedText style={styles.summaryLabel}>Total Earned</ThemedText>
          </View>
        </View>

        <View style={styles.payoutInfoCard}>
          <View style={styles.payoutRow}>
            <Feather name="calendar" size={16} color={Colors.light.accent} />
            <View style={styles.payoutText}>
              <ThemedText style={styles.payoutLabel}>Payout processing</ThemedText>
              <ThemedText style={styles.payoutValue}>{snapshot.nextPayoutDate}</ThemedText>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.payoutRow}>
            <Feather name="credit-card" size={16} color={Colors.light.accent} />
            <View style={styles.payoutText}>
              <ThemedText style={styles.payoutLabel}>Payout destination</ThemedText>
              <ThemedText style={styles.payoutValue}>{snapshot.bankAccountLabel}</ThemedText>
              {!bankLinked ? (
                <ThemedText style={styles.payoutHint}>{BANK_NOT_LINKED_NOTICE}</ThemedText>
              ) : null}
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.payoutRow}>
            <Feather name="percent" size={16} color={Colors.light.accent} />
            <View style={styles.payoutText}>
              <ThemedText style={styles.payoutLabel}>Platform Commission</ThemedText>
              <ThemedText style={styles.payoutValue}>{snapshot.commissionRate}% per session</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={[styles.sectionTitle, { marginBottom: Spacing.md }]}>
            Transaction History
          </ThemedText>
          {snapshot.transactions.map((txn) => (
            <TransactionRow key={txn.id} txn={txn} />
          ))}
        </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundRoot },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  disclosureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  disclosureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
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
    width: "100%",
    textAlign: "center",
    paddingHorizontal: Spacing.md,
  },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    minHeight: 44,
    width: "100%",
  },
  withdrawBtnText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  withdrawBtnDisabled: {
    opacity: 0.55,
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
  payoutHint: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: 4,
    lineHeight: 16,
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
  stateBlock: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xl * 2,
  },
  stateText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.accent,
  },
  retryBtnText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
