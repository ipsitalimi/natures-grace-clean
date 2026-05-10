import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import AppHeader from "@/components/AppHeader";
import SellerDrawer from "@/components/SellerDrawer";
import {
  sellerStats,
  sellerProducts,
  sellerOrders,
  weeklyRevenueData,
} from "@/data/sellerMockData";

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBg, { backgroundColor: `${color}18` }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

function MiniBarChart() {
  const maxAmount = Math.max(...weeklyRevenueData.map((d) => d.amount));
  const todayIdx = 4;
  return (
    <View style={styles.barChartRow}>
      {weeklyRevenueData.map((d, i) => {
        const heightPct = (d.amount / maxAmount) * 56;
        const isToday = i === todayIdx;
        return (
          <View key={d.day} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: heightPct,
                    backgroundColor: isToday ? Colors.light.accent : `${Colors.light.accent}40`,
                  },
                ]}
              />
            </View>
            <ThemedText style={[styles.barLabel, isToday && styles.barLabelToday]}>
              {d.day}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function QuickActionBtn({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickAction,
        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
      ]}
      onPress={onPress}
      testID={`quick-action-${label.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
        <Feather name={icon as any} size={22} color={color} />
      </View>
      <ThemedText style={styles.quickActionLabel}>{label}</ThemedText>
    </Pressable>
  );
}

export default function SellerHomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const pendingOrders = sellerOrders.filter((o) => o.status === "Pending").length;
  const lowStockProducts = sellerProducts.filter((p) => p.status === "Low Stock");
  const topProduct = sellerProducts.reduce(
    (best, p) => ((p.purchases ?? 0) > (best.purchases ?? 0) ? p : best),
    sellerProducts[0]
  );
  const recentOrders = sellerOrders.slice(0, 3);

  return (
    <View style={styles.container}>
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <AppHeader onProfilePress={() => setDrawerVisible(true)} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingSection}>
          <View>
            <ThemedText style={styles.greetingText}>
              Welcome back, <ThemedText style={styles.nameHighlight}>Priya</ThemedText>
            </ThemedText>
            <ThemedText style={styles.storeName}>Priya's Wellness Store</ThemedText>
          </View>
          <Pressable
            style={styles.notifBtn}
            onPress={() => navigation.navigate("Notifications")}
            testID="button-notifications"
          >
            <Feather name="bell" size={20} color={Colors.light.accent} />
            {pendingOrders > 0 ? <View style={styles.notifDot} /> : null}
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard label="Total Sales" value={`Rs.${(sellerStats.revenue / 1000).toFixed(1)}k`} color="#4A5A2B" icon="trending-up" />
            <StatCard label="This Week" value={`${sellerStats.ordersThisWeek} orders`} color="#6CB4D9" icon="shopping-bag" />
            <StatCard label="Pending" value={`${sellerStats.pendingOrders}`} color="#D4943A" icon="clock" />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Rating" value={`${sellerStats.storeRating}`} color="#D4728B" icon="star" />
            <StatCard label="Products" value={`${sellerStats.totalProducts}`} color="#7BC47F" icon="package" />
            <StatCard label="Wallet" value={`Rs.${(sellerStats.walletBalance / 1000).toFixed(1)}k`} color="#7B68EE" icon="credit-card" />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.sectionTitle}>Weekly Revenue</ThemedText>
            <Pressable onPress={() => navigation.navigate("SellerAnalytics")} testID="button-view-analytics">
              <ThemedText style={styles.seeAll}>Full Analytics</ThemedText>
            </Pressable>
          </View>
          <ThemedText style={styles.revenueTotal}>
            Rs. {weeklyRevenueData.reduce((s, d) => s + d.amount, 0).toLocaleString()}
          </ThemedText>
          <MiniBarChart />
        </View>

        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        <View style={styles.quickActionsGrid}>
          <View style={styles.quickActionsRow}>
            <QuickActionBtn icon="plus-circle" label="Add Product" color="#4A5A2B" onPress={() => navigation.navigate("AddEditProductListing", {})} />
            <QuickActionBtn icon="list" label="Orders" color="#6CB4D9" onPress={() => navigation.navigate("SellerOrders")} />
            <QuickActionBtn icon="tag" label="Offers" color="#D4943A" onPress={() => navigation.navigate("SellerPromotions")} />
          </View>
          <View style={styles.quickActionsRow}>
            <QuickActionBtn icon="edit" label="Edit Store" color="#D4728B" onPress={() => navigation.navigate("SellerStoreCustomization")} />
            <QuickActionBtn icon="bar-chart-2" label="Analytics" color="#7BC47F" onPress={() => navigation.navigate("SellerAnalytics")} />
            <QuickActionBtn icon="credit-card" label="Wallet" color="#7B68EE" onPress={() => navigation.navigate("SellerWallet")} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.sectionTitle}>Insights</ThemedText>
          </View>

          {lowStockProducts.length > 0 ? (
            <View style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: "#D4943A" }]} />
              <View style={styles.insightText}>
                <ThemedText style={styles.insightTitle}>Low Stock Alert</ThemedText>
                <ThemedText style={styles.insightSub}>
                  {lowStockProducts.map((p) => p.name).join(", ")} running low
                </ThemedText>
              </View>
              <Pressable onPress={() => navigation.navigate("SellerProductsTab")} testID="button-manage-stock">
                <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.insightRow}>
            <View style={[styles.insightDot, { backgroundColor: "#4A5A2B" }]} />
            <View style={styles.insightText}>
              <ThemedText style={styles.insightTitle}>Best Performer</ThemedText>
              <ThemedText style={styles.insightSub}>
                {topProduct.name} — {topProduct.purchases} purchases
              </ThemedText>
            </View>
          </View>

          <View style={styles.insightRow}>
            <View style={[styles.insightDot, { backgroundColor: "#6CB4D9" }]} />
            <View style={styles.insightText}>
              <ThemedText style={styles.insightTitle}>Recent Activity</ThemedText>
              <ThemedText style={styles.insightSub}>
                {recentOrders.length} new orders in the last 24 hours
              </ThemedText>
            </View>
            <Pressable onPress={() => navigation.navigate("SellerOrders")} testID="button-view-orders">
              <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
            </Pressable>
          </View>

          <View style={styles.insightRow}>
            <View style={[styles.insightDot, { backgroundColor: "#D4728B" }]} />
            <View style={styles.insightText}>
              <ThemedText style={styles.insightTitle}>Store Tip</ThemedText>
              <ThemedText style={styles.insightSub}>
                Add product photos to increase views by up to 60%
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.sectionTitle}>Recent Orders</ThemedText>
            <Pressable onPress={() => navigation.navigate("SellerOrders")} testID="button-all-orders">
              <ThemedText style={styles.seeAll}>See All</ThemedText>
            </Pressable>
          </View>
          {recentOrders.map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <View style={styles.orderLeft}>
                <ThemedText style={styles.orderName}>{order.customerName}</ThemedText>
                <ThemedText style={styles.orderProduct} numberOfLines={1}>{order.productName}</ThemedText>
              </View>
              <View style={styles.orderRight}>
                <ThemedText style={styles.orderPrice}>Rs. {order.price.toLocaleString()}</ThemedText>
                <View style={[styles.orderStatusBadge, { backgroundColor: order.status === "Pending" ? "rgba(212,148,58,0.12)" : "rgba(1,50,32,0.08)" }]}>
                  <ThemedText style={[styles.orderStatusText, { color: order.status === "Pending" ? "#B8860B" : "#013220" }]}>
                    {order.status}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  greetingSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  greetingText: {
    fontSize: 20,
    color: Colors.light.text,
    fontFamily: "ui-serif",
  },
  nameHighlight: {
    fontWeight: "600",
    fontStyle: "italic",
    color: Colors.light.accent,
    fontSize: 20,
  },
  storeName: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D4534A",
  },
  statsGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
    gap: 4,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  revenueTotal: {
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: Spacing.md,
  },
  barChartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 80,
  },
  barCol: {
    alignItems: "center",
    flex: 1,
  },
  barTrack: {
    flex: 1,
    width: 20,
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  barFill: {
    width: 20,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  barLabelToday: {
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  quickActionsGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    gap: 8,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    textAlign: "center",
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}25`,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  insightText: {
    flex: 1,
    gap: 2,
  },
  insightTitle: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  insightSub: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    lineHeight: 16,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}25`,
  },
  orderLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  orderName: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  orderProduct: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  orderRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  orderPrice: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderStatusText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
  },
});
