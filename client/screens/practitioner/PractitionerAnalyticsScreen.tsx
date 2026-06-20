import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import { formatInr, formatInrCompact } from "@/lib/formatCurrency";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

type Period = "Weekly" | "Monthly";

function BarChart({ data }: { data: { label: string; amount: number }[] }) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  return (
    <View style={styles.barChart}>
      {data.map((d, i) => {
        const heightPct = Math.max((d.amount / maxAmount) * 100, 6);
        const isLast = i === data.length - 1;
        return (
          <View key={`${d.label}-${i}`} style={styles.barCol}>
            <ThemedText style={styles.barAmount}>{d.amount}</ThemedText>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: `${heightPct}%`,
                    backgroundColor: isLast ? Colors.light.accent : `${Colors.light.accent}35`,
                  },
                ]}
              />
            </View>
            <ThemedText style={[styles.barLabel, isLast && styles.barLabelActive]}>
              {d.label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

export default function PractitionerAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { dashboard, stats, sessions, loading, loadError, refresh } = usePractitionerContext();
  const [period, setPeriod] = useState<Period>("Weekly");
  const [refreshing, setRefreshing] = useState(false);

  const weeklyData = dashboard.weeklySessions.map((p) => ({
    label: p.day,
    amount: p.amount,
  }));

  const monthlyPoints = buildMonthlySessionPoints(sessions);
  const chartData = period === "Weekly" ? weeklyData : monthlyPoints;
  const chartTotal = chartData.reduce((s, d) => s + d.amount, 0);

  const serviceBreakdown = buildServiceBreakdown(sessions);
  const maxService = Math.max(...serviceBreakdown.map((s) => s.count), 1);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <ThemedText style={styles.headerKicker}>Your practice</ThemedText>
          <ThemedText style={styles.headerTitle}>Analytics</ThemedText>
        </View>
        <Pressable style={styles.backBtn} onPress={() => void handleRefresh()} testID="button-refresh-analytics">
          <Feather name="refresh-cw" size={18} color={Colors.light.accent} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: getScrollBottomPadding(insets.bottom, 32) }]}
      >
        <ThemedText style={styles.introLine}>
          Sessions and earnings from your live booking data.
        </ThemedText>

        {loading || refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.light.accent} size="large" />
          </View>
        ) : loadError ? (
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>{loadError}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={() => void handleRefresh()}>
              <ThemedText style={styles.retryText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : !isSupabaseConfigured() ? (
          <ThemedText style={styles.hintText}>Connect Supabase to view analytics.</ThemedText>
        ) : (
          <>
            <View style={styles.overviewRow}>
              <View style={[styles.overviewCard, styles.cardElevated]}>
                <ThemedText style={styles.overviewLabel}>This month</ThemedText>
                <ThemedText style={styles.overviewValue}>
                  {dashboard.monthlyEarnings >= 1000
                    ? formatInrCompact(dashboard.monthlyEarnings)
                    : formatInr(dashboard.monthlyEarnings)}
                </ThemedText>
                <ThemedText style={styles.overviewHint}>paid sessions</ThemedText>
              </View>
              <View style={[styles.overviewCard, styles.cardElevated]}>
                <ThemedText style={styles.overviewLabel}>Rating</ThemedText>
                <ThemedText style={styles.overviewValue}>
                  {dashboard.reviewCount > 0 ? dashboard.avgRating.toFixed(1) : "—"}
                </ThemedText>
                <ThemedText style={styles.overviewHint}>
                  {dashboard.reviewCount} review{dashboard.reviewCount === 1 ? "" : "s"}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.card, styles.cardElevated]}>
              <View style={styles.periodRow}>
                {(["Weekly", "Monthly"] as Period[]).map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.periodChip, period === p && styles.periodChipActive]}
                    onPress={() => setPeriod(p)}
                  >
                    <ThemedText
                      style={[styles.periodChipText, period === p && styles.periodChipTextActive]}
                    >
                      {p}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <ThemedText style={styles.chartTitle}>
                {period === "Weekly" ? "Sessions (last 7 days)" : "Sessions (last 6 months)"}
              </ThemedText>
              <BarChart data={chartData} />
              <ThemedText style={styles.chartFooter}>
                {chartTotal} session{chartTotal === 1 ? "" : "s"} in period
              </ThemedText>
            </View>

            <View style={[styles.card, styles.cardElevated]}>
              <ThemedText style={styles.sectionTitle}>Session overview</ThemedText>
              <View style={styles.metricRow}>
                <ThemedText style={styles.metricLabel}>Upcoming</ThemedText>
                <ThemedText style={styles.metricValue}>{stats.upcomingSessions}</ThemedText>
              </View>
              <View style={styles.metricRow}>
                <ThemedText style={styles.metricLabel}>Completed this month</ThemedText>
                <ThemedText style={styles.metricValue}>{stats.completedThisMonth}</ThemedText>
              </View>
              <View style={styles.metricRow}>
                <ThemedText style={styles.metricLabel}>Total sessions</ThemedText>
                <ThemedText style={styles.metricValue}>{stats.totalSessions}</ThemedText>
              </View>
              <View style={styles.metricRow}>
                <ThemedText style={styles.metricLabel}>Wallet balance</ThemedText>
                <ThemedText style={styles.metricValue}>{formatInr(stats.walletBalance)}</ThemedText>
              </View>
            </View>

            {serviceBreakdown.length > 0 ? (
              <View style={[styles.card, styles.cardElevated]}>
                <ThemedText style={styles.sectionTitle}>By service</ThemedText>
                {serviceBreakdown.map((row) => (
                  <View key={row.service} style={styles.serviceRow}>
                    <View style={styles.serviceMeta}>
                      <ThemedText style={styles.serviceName} numberOfLines={1}>
                        {row.service}
                      </ThemedText>
                      <ThemedText style={styles.serviceCount}>{row.count} bookings</ThemedText>
                    </View>
                    <View style={styles.serviceBarTrack}>
                      <View
                        style={[
                          styles.serviceBarFill,
                          { width: `${Math.max((row.count / maxService) * 100, 8)}%` },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function buildMonthlySessionPoints(
  sessions: { status: string; date: string }[]
): { label: string; amount: number }[] {
  const now = new Date();
  const months: { label: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-GB", { month: "short" });
    const count = sessions.filter((s) => {
      if (s.status === "Cancelled") return false;
      const raw = s.date;
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed.getMonth() === d.getMonth() && parsed.getFullYear() === d.getFullYear();
    }).length;
    months.push({ label, amount: count });
  }
  return months;
}

function buildServiceBreakdown(
  sessions: { status: string; service: string }[]
): { service: string; count: number }[] {
  const map = new Map<string, number>();
  for (const s of sessions) {
    if (s.status === "Cancelled") continue;
    map.set(s.service, (map.get(s.service) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
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
  headerTitleBlock: { flex: 1, alignItems: "center" },
  headerKicker: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontFamily: "Nunito_400Regular",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  introLine: {
    fontSize: 14,
    color: Colors.light.textMuted,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.sm,
  },
  centered: { alignItems: "center", paddingVertical: Spacing.xl, gap: Spacing.md },
  errorText: { color: "#8B3A3A", textAlign: "center" },
  hintText: { color: Colors.light.textMuted, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.cardBackground,
  },
  retryText: { color: Colors.light.accent, fontFamily: "Nunito_700Bold" },
  overviewRow: { flexDirection: "row", gap: Spacing.sm },
  overviewCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: 4,
  },
  cardElevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  overviewLabel: { fontSize: 12, color: Colors.light.textMuted },
  overviewValue: { fontSize: 22, fontFamily: "Nunito_700Bold", color: Colors.light.text },
  overviewHint: { fontSize: 12, color: Colors.light.textMuted },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  periodRow: { flexDirection: "row", gap: Spacing.sm },
  periodChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundRoot,
  },
  periodChipActive: { backgroundColor: Colors.light.accent },
  periodChipText: { fontSize: 13, color: Colors.light.textMuted, fontFamily: "Nunito_700Bold" },
  periodChipTextActive: { color: "#FFFFFF" },
  chartTitle: { fontSize: 15, fontFamily: "Nunito_700Bold", color: Colors.light.text },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
    marginTop: Spacing.sm,
  },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barAmount: { fontSize: 10, color: Colors.light.textMuted },
  barTrack: {
    width: "70%",
    height: 100,
    backgroundColor: `${Colors.light.divider}30`,
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 10, color: Colors.light.textMuted },
  barLabelActive: { color: Colors.light.accent, fontFamily: "Nunito_700Bold" },
  chartFooter: { fontSize: 12, color: Colors.light.textMuted, textAlign: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Nunito_700Bold", color: Colors.light.text },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}25`,
  },
  metricLabel: { fontSize: 14, color: Colors.light.textMuted },
  metricValue: { fontSize: 14, fontFamily: "Nunito_700Bold", color: Colors.light.text },
  serviceRow: { gap: 6, marginBottom: Spacing.sm },
  serviceMeta: { flexDirection: "row", justifyContent: "space-between", gap: Spacing.sm },
  serviceName: { flex: 1, fontSize: 14, fontFamily: "Nunito_700Bold", color: Colors.light.text },
  serviceCount: { fontSize: 12, color: Colors.light.textMuted },
  serviceBarTrack: {
    height: 6,
    backgroundColor: `${Colors.light.divider}30`,
    borderRadius: 3,
    overflow: "hidden",
  },
  serviceBarFill: { height: "100%", backgroundColor: Colors.light.accent, borderRadius: 3 },
});
