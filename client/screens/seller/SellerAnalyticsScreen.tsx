import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import {
  weeklyRevenueData,
  monthlyRevenueData,
  categoryPerformance,
  sellerStats,
  sellerProducts,
} from "@/data/sellerMockData";

type Period = "Weekly" | "Monthly";

function BarChart({ data, period }: { data: { label: string; amount: number }[]; period: Period }) {
  const maxAmount = Math.max(...data.map((d) => d.amount));
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
                    backgroundColor: isLast ? Colors.light.accent : `${Colors.light.accent}45`,
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
  const [period, setPeriod] = useState<Period>("Weekly");

  const chartData =
    period === "Weekly"
      ? weeklyRevenueData.map((d) => ({ label: d.day, amount: d.amount }))
      : monthlyRevenueData.map((d) => ({ label: d.month, amount: d.amount }));

  const totalRevenue = chartData.reduce((s, d) => s + d.amount, 0);
  const topProduct = sellerProducts.reduce(
    (best, p) => ((p.purchases ?? 0) > (best.purchases ?? 0) ? p : best),
    sellerProducts[0]
  );

  const maxSales = Math.max(...categoryPerformance.map((c) => c.sales));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Analytics</ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <ThemedText style={styles.overviewValue}>
              Rs. {(sellerStats.revenue / 1000).toFixed(1)}k
            </ThemedText>
            <ThemedText style={styles.overviewLabel}>Total Revenue</ThemedText>
          </View>
          <View style={styles.overviewCard}>
            <ThemedText style={styles.overviewValue}>{sellerStats.totalSales}</ThemedText>
            <ThemedText style={styles.overviewLabel}>Total Orders</ThemedText>
          </View>
          <View style={styles.overviewCard}>
            <ThemedText style={styles.overviewValue}>{sellerStats.storeRating}</ThemedText>
            <ThemedText style={styles.overviewLabel}>Store Rating</ThemedText>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.sectionTitle}>Revenue Trend</ThemedText>
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
            Rs. {totalRevenue.toLocaleString()}
            <ThemedText style={styles.totalSub}>  {period === "Weekly" ? "this week" : "this year"}</ThemedText>
          </ThemedText>
          <BarChart data={chartData} period={period} />
        </View>

        <View style={styles.card}>
          <ThemedText style={[styles.sectionTitle, { marginBottom: Spacing.lg }]}>
            Category Performance
          </ThemedText>
          {categoryPerformance.map((cat) => (
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
          ))}
        </View>

        <View style={styles.card}>
          <ThemedText style={[styles.sectionTitle, { marginBottom: Spacing.lg }]}>
            Product Performance
          </ThemedText>
          {sellerProducts
            .sort((a, b) => (b.purchases ?? 0) - (a.purchases ?? 0))
            .slice(0, 5)
            .map((product, idx) => (
              <View key={product.id} style={styles.prodRow}>
                <ThemedText style={styles.prodRank}>#{idx + 1}</ThemedText>
                <View style={styles.prodInfo}>
                  <ThemedText style={styles.prodName} numberOfLines={1}>
                    {product.name}
                  </ThemedText>
                  <ThemedText style={styles.prodMeta}>
                    {product.views} views  ·  {product.saves} saves  ·  {product.purchases} sales
                  </ThemedText>
                </View>
                <ThemedText style={styles.prodRevenue}>
                  Rs. {((product.purchases ?? 0) * product.price / 1000).toFixed(0)}k
                </ThemedText>
              </View>
            ))}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Feather name="eye" size={20} color="#6CB4D9" />
            <ThemedText style={styles.metricValue}>
              {sellerProducts.reduce((s, p) => s + (p.views ?? 0), 0).toLocaleString()}
            </ThemedText>
            <ThemedText style={styles.metricLabel}>Total Views</ThemedText>
          </View>
          <View style={styles.metricCard}>
            <Feather name="heart" size={20} color="#D4728B" />
            <ThemedText style={styles.metricValue}>
              {sellerProducts.reduce((s, p) => s + (p.saves ?? 0), 0)}
            </ThemedText>
            <ThemedText style={styles.metricLabel}>Total Saves</ThemedText>
          </View>
          <View style={styles.metricCard}>
            <Feather name="shopping-cart" size={20} color="#D4943A" />
            <ThemedText style={styles.metricValue}>
              {sellerProducts.reduce((s, p) => s + (p.cartAdds ?? 0), 0)}
            </ThemedText>
            <ThemedText style={styles.metricLabel}>Cart Adds</ThemedText>
          </View>
          <View style={styles.metricCard}>
            <Feather name="percent" size={20} color="#4A5A2B" />
            <ThemedText style={styles.metricValue}>
              {Math.round(
                (sellerProducts.reduce((s, p) => s + (p.purchases ?? 0), 0) /
                  sellerProducts.reduce((s, p) => s + (p.views ?? 0), 0)) *
                  100
              )}%
            </ThemedText>
            <ThemedText style={styles.metricLabel}>Conversion</ThemedText>
          </View>
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
  overviewRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
    gap: 4,
  },
  overviewValue: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  overviewLabel: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
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
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: Spacing.lg,
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
    height: 110,
    gap: 4,
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
    borderRadius: 4,
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
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
    gap: 6,
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
