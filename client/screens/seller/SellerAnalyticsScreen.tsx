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
import { useReviews } from "@/context/ReviewsContext";
import { useSellerAnalytics } from "@/context/SellerAnalyticsContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

type Period = "Weekly" | "Monthly";

function BarChart({ data, period }: { data: { label: string; amount: number }[]; period: Period }) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  return (
    <View style={styles.barChart}>
      {data.map((d, i) => {
        const heightPct = Math.max((d.amount / maxAmount) * 100, 6);
        const isLast = i === data.length - 1;
        return (
          <View key={d.label} style={styles.barCol}>
            <ThemedText style={styles.barAmount}>
              {d.amount >= 1000 ? `${(d.amount / 1000).toFixed(0)}k` : d.amount}
            </ThemedText>
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

export default function SellerAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { sellerStoreStats } = useReviews();
  const {
    stats,
    weeklyRevenue,
    monthlyRevenue,
    categoryPerformance,
    productSales,
    analyticsLoading,
    analyticsError,
    refreshAnalytics,
  } = useSellerAnalytics();
  const storeRatingDisplay =
    sellerStoreStats.reviewCount > 0
      ? sellerStoreStats.avgRating.toFixed(1)
      : "—";
  const [period, setPeriod] = useState<Period>("Weekly");

  const chartData = period === "Weekly" ? weeklyRevenue : monthlyRevenue;
  const totalRevenue = chartData.reduce((s, d) => s + d.amount, 0);
  const maxSales = Math.max(...categoryPerformance.map((c) => c.sales), 1);

  const revenueOverview =
    stats.revenue >= 1000 ? formatInrCompact(stats.revenue) : formatInr(stats.revenue);

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
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: getScrollBottomPadding(insets.bottom, 32) }]}
      >
        <ThemedText style={styles.introLine}>A quiet view of how your store breathes.</ThemedText>

        {analyticsLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.light.accent} size="large" />
            <ThemedText style={styles.hintText}>Loading analytics…</ThemedText>
          </View>
        ) : analyticsError ? (
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>{analyticsError}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={() => refreshAnalytics()}>
              <ThemedText style={styles.retryText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.overviewRow}>
              <View style={[styles.overviewCard, styles.cardElevated]}>
                <ThemedText style={styles.overviewLabel}>Revenue</ThemedText>
                <ThemedText style={styles.overviewValue}>{revenueOverview}</ThemedText>
                <ThemedText style={styles.overviewHint}>lifetime paid</ThemedText>
              </View>
              <View style={[styles.overviewCard, styles.cardElevated]}>
                <ThemedText style={styles.overviewLabel}>Orders</ThemedText>
                <ThemedText style={styles.overviewValue}>{stats.totalSales}</ThemedText>
                <ThemedText style={styles.overviewHint}>fulfilled journey</ThemedText>
              </View>
              <View style={[styles.overviewCard, styles.cardElevated]}>
                <ThemedText style={styles.overviewLabel}>Rating</ThemedText>
                <ThemedText style={styles.overviewValue}>{storeRatingDisplay}</ThemedText>
                <ThemedText style={styles.overviewHint}>community love</ThemedText>
              </View>
            </View>

            <View style={[styles.card, styles.cardElevated]}>
              <View style={styles.cardHeader}>
                <ThemedText style={styles.sectionTitle}>Revenue trend</ThemedText>
                <View style={styles.periodToggle}>
                  {(["Weekly", "Monthly"] as Period[]).map((p) => (
                    <Pressable
                      key={p}
                      style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                      onPress={() => setPeriod(p)}
                      testID={`period-${p.toLowerCase()}`}
                    >
                      <ThemedText style={[styles.periodText, period === p && styles.periodTextActive]}>
                        {p}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <ThemedText style={styles.totalLabel}>
                {formatInr(totalRevenue)}
                <ThemedText style={styles.totalSub}>
                  {" "}
                  {period === "Weekly" ? "this week" : "last 6 months"}
                </ThemedText>
              </ThemedText>
              {chartData.every((d) => d.amount === 0) ? (
                <ThemedText style={styles.hintText}>No paid revenue in this period yet.</ThemedText>
              ) : (
                <BarChart data={chartData} period={period} />
              )}
            </View>

            <View style={[styles.card, styles.cardElevated]}>
              <ThemedText style={[styles.sectionTitle, { marginBottom: Spacing.xl }]}>
                Category presence
              </ThemedText>
              {categoryPerformance.length === 0 ? (
                <ThemedText style={styles.hintText}>
                  Category breakdown appears when you have paid orders.
                </ThemedText>
              ) : (
                categoryPerformance.map((cat) => (
                  <View key={cat.category} style={styles.catRow}>
                    <View style={styles.catLeft}>
                      <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                      <ThemedText style={styles.catName}>{cat.category}</ThemedText>
                    </View>
                    <View style={styles.catBarWrap}>
                      <View
                        style={[
                          styles.catBar,
                          {
                            width: `${(cat.sales / maxSales) * 100}%`,
                            backgroundColor: cat.color,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText style={styles.catSales}>{cat.sales}</ThemedText>
                  </View>
                ))
              )}
            </View>

            <View style={[styles.card, styles.cardElevated]}>
              <ThemedText style={[styles.sectionTitle, { marginBottom: Spacing.xl }]}>
                Products that resonate
              </ThemedText>
              {productSales.length === 0 ? (
                <ThemedText style={styles.hintText}>
                  Paid order sales will appear here once customers purchase your products.
                </ThemedText>
              ) : (
                productSales.slice(0, 5).map((row, idx) => (
                  <View key={row.productId} style={styles.prodRow}>
                    <ThemedText style={styles.prodRank}>#{idx + 1}</ThemedText>
                    <View style={styles.prodInfo}>
                      <ThemedText style={styles.prodName} numberOfLines={1}>
                        {row.productName}
                      </ThemedText>
                      <ThemedText style={styles.prodMeta}>
                        {row.quantity} {row.quantity === 1 ? "sale" : "sales"} · paid orders
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.prodRevenue}>
                      {row.revenue >= 1000
                        ? formatInrCompact(row.revenue)
                        : formatInr(row.revenue)}
                    </ThemedText>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {!isSupabaseConfigured() && !analyticsLoading ? (
          <ThemedText style={styles.hintText}>
            Connect Supabase to load revenue and chart data from your orders.
          </ThemedText>
        ) : null}
      </ScrollView>
    </View>
  );
}

const ELEV = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 3,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundRoot },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleBlock: {
    alignItems: "center",
  },
  headerKicker: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "ui-serif",
    fontWeight: "600",
    color: Colors.light.text,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing["2xl"],
  },
  introLine: {
    fontSize: 14,
    fontStyle: "italic",
    fontFamily: "ui-serif",
    color: Colors.light.brown,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: -Spacing.sm,
    marginTop: -Spacing.xs,
  },
  centered: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.md,
  },
  hintText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "#8B3A3A",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.xs,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  overviewRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    gap: 6,
  },
  cardElevated: {
    ...ELEV,
  },
  overviewValue: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  overviewLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    textAlign: "center",
  },
  overviewHint: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    opacity: 0.85,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: Spacing.xl,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "ui-serif",
    fontWeight: "600",
    color: Colors.light.text,
  },
  secondarySectionLabel: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    marginBottom: -Spacing.md,
  },
  periodToggle: {
    flexDirection: "row",
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: 8,
    padding: 2,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  periodBtnActive: {
    backgroundColor: Colors.light.accent,
  },
  periodText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  periodTextActive: {
    color: "#FFFFFF",
  },
  totalLabel: {
    fontSize: 26,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: Spacing.xl,
  },
  totalSub: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  barChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 132,
    gap: 8,
    paddingTop: Spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
    gap: 4,
  },
  barAmount: {
    fontSize: 9,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  barTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    maxWidth: 28,
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  barLabelActive: {
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  catLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 100,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  catName: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    flexShrink: 1,
  },
  catBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: 4,
    overflow: "hidden",
  },
  catBar: {
    height: 8,
    borderRadius: 4,
  },
  catSales: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    width: 28,
    textAlign: "right",
  },
  prodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}25`,
  },
  prodRank: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    width: 24,
  },
  prodInfo: {
    flex: 1,
    gap: 2,
  },
  prodName: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  prodMeta: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  prodRevenue: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: "42%",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: Spacing.lg,
    alignItems: "center",
    gap: 8,
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
  },
  metricValue: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
  },
});
