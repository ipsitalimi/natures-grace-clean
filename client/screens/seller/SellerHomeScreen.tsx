import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Shadows } from "@/constants/theme";
import { CardTokens, Layout, LayoutSpacing } from "@/constants/layout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import {
  DashboardWelcomeCard,
  DashboardSectionTitle,
  DashboardQuickActionGrid,
  getTimeGreeting,
} from "@/components/dashboard";
import { useDrawer } from "@/context/DrawerContext";
import type { SellerPromo } from "@/data/sellerMockData";
import {
  fetchSellerStorefrontByProfileId,
  type SellerStorefront,
} from "@/services/commerce/sellerStorefrontService";
import type { RevenueChartPoint } from "@/data/sellerAnalytics";
import { useDataContext } from "@/context/DataContext";
import { useOrdersContext } from "@/context/OrdersContext";
import { useWalletContext } from "@/context/WalletContext";
import { useReviews } from "@/context/ReviewsContext";
import { useSellerAnalytics } from "@/context/SellerAnalyticsContext";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { formatInr, formatInrCompact } from "@/lib/formatCurrency";
import { resolveSellerIdByProfileId } from "@/services/commerce/sellerId";
import {
  listSellerPromos,
  toSellerPromoDisplay,
  type SellerPromoKind,
  type SellerPromoRow,
} from "@/services/commerce/sellerPromosService";

const ICON_SIZE = 20;
const ICON_WRAP = 36;
const CARD_SHADOW = Shadows.soft;

function InsightIcon({ name }: { name: React.ComponentProps<typeof Feather>["name"] }) {
  return (
    <View style={styles.iconCircle}>
      <Feather name={name} size={ICON_SIZE} color={Colors.light.accent} />
    </View>
  );
}

function KeyMetricCard({
  label,
  value,
  hint,
  testID,
}: {
  label: string;
  value: string;
  hint?: string;
  testID?: string;
}) {
  return (
    <View style={styles.keyMetricCard} testID={testID}>
      <ThemedText style={styles.keyMetricLabel}>{label}</ThemedText>
      <ThemedText style={styles.keyMetricValue}>{value}</ThemedText>
      {hint ? <ThemedText style={styles.keyMetricHint}>{hint}</ThemedText> : null}
    </View>
  );
}

function WeeklyRhythmChart({ data }: { data: RevenueChartPoint[] }) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const jsDay = new Date().getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
  return (
    <View style={styles.chartRow}>
      {data.map((d, i) => {
        const heightPct = (d.amount / maxAmount) * 72;
        const isToday = i === todayIdx;
        return (
          <View key={d.label} style={styles.chartCol}>
            <View style={styles.chartTrack}>
              <View
                style={[
                  styles.chartFill,
                  {
                    height: heightPct,
                    backgroundColor: isToday ? Colors.light.accent : `${Colors.light.accent}38`,
                  },
                ]}
              />
            </View>
            <ThemedText style={[styles.chartDay, isToday && styles.chartDayToday]}>{d.label}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

type SellerPromoView = SellerPromo & {
  dbStatus: SellerPromoRow["status"];
  promoKind: SellerPromoKind;
  startsAt: string | null;
  expiresAtIso: string | null;
};

function pickLiveCampaign(rows: SellerPromoView[], kind: Exclude<SellerPromoKind, "standard">): SellerPromoView | null {
  return rows.find((r) => r.promoKind === kind && (r.status === "Active" || r.status === "Paused")) ?? null;
}

function formatPromoDiscount(p: SellerPromoView): string {
  return p.type === "Percentage" ? `${p.value}% off` : `${formatInr(p.value)} off`;
}

function usageSummary(p: SellerPromoView): string {
  return p.usageLimit == null ? `${p.usageCount} used · no cap` : `${p.usageCount}/${p.usageLimit} used`;
}

function PromoSummaryRow({
  title,
  body,
  muted,
  isLast,
  testID,
}: {
  title: string;
  body: string;
  muted?: boolean;
  isLast?: boolean;
  testID?: string;
}) {
  return (
    <View style={[styles.promoSummaryRow, isLast && styles.promoSummaryRowLast]} testID={testID}>
      <ThemedText style={styles.promoSummaryTitle}>{title}</ThemedText>
      <ThemedText style={[styles.promoSummaryBody, muted && styles.promoSummaryMuted]}>{body}</ThemedText>
    </View>
  );
}

export default function SellerHomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const { openDrawer } = useDrawer();
  const { session } = useAuth();
  const [promoRows, setPromoRows] = useState<SellerPromoView[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSellerId, setPromoSellerId] = useState<string | null>(null);
  const [storefront, setStorefront] = useState<SellerStorefront | null>(null);
  const [storefrontLoading, setStorefrontLoading] = useState(false);
  const [storefrontError, setStorefrontError] = useState<string | null>(null);
  const { sellerCatalog: sellerProducts } = useDataContext();
  const { recentOrders, pendingOrderCount } = useOrdersContext();
  const { snapshot: wallet } = useWalletContext();
  const { sellerStoreStats } = useReviews();
  const {
    stats,
    weeklyRevenue,
    monthlyRevenue,
    productSales,
    analyticsLoading,
    analyticsError,
    refreshAnalytics,
  } = useSellerAnalytics();
  const storeRatingDisplay =
    sellerStoreStats.reviewCount > 0
      ? sellerStoreStats.avgRating.toFixed(1)
      : "—";

  const lowStockProducts = sellerProducts.filter((p) => p.status === "Low Stock");
  const topSale = productSales[0];

  const { monthlyAmount, growthPct } = useMemo(() => {
    const m = monthlyRevenue;
    if (m.length < 2) {
      return { monthlyAmount: m[m.length - 1]?.amount ?? 0, growthPct: 0 };
    }
    const last = m[m.length - 1].amount;
    const prev = m[m.length - 2].amount;
    return {
      monthlyAmount: last,
      growthPct: prev ? ((last - prev) / prev) * 100 : 0,
    };
  }, [monthlyRevenue]);

  const weeklyTotal = weeklyRevenue.reduce((s, d) => s + d.amount, 0);
  const revenueDisplay =
    stats.revenue >= 1000 ? formatInrCompact(stats.revenue) : formatInr(stats.revenue);
  const walletDisplay =
    wallet.availableBalance >= 1000
      ? formatInrCompact(wallet.availableBalance)
      : formatInr(wallet.availableBalance);
  const listingCount = sellerProducts.length;

  const loadStorefront = useCallback(async () => {
    if (!session?.user?.id || !isSupabaseConfigured()) {
      setStorefront(null);
      setStorefrontLoading(false);
      setStorefrontError(null);
      return;
    }
    setStorefrontLoading(true);
    setStorefrontError(null);
    const res = await fetchSellerStorefrontByProfileId(session.user.id);
    setStorefrontLoading(false);
    if (!res.ok) {
      setStorefrontError(res.error);
      setStorefront(null);
      return;
    }
    setStorefront(res.storefront);
  }, [session?.user?.id]);

  const loadPromos = useCallback(async () => {
    if (!session?.user?.id || !isSupabaseConfigured()) {
      setPromoSellerId(null);
      setPromoRows([]);
      setPromoLoading(false);
      setPromoError(null);
      return;
    }
    setPromoLoading(true);
    setPromoError(null);
    const sid = await resolveSellerIdByProfileId(session.user.id);
    setPromoSellerId(sid);
    if (!sid) {
      setPromoRows([]);
      setPromoLoading(false);
      return;
    }
    const res = await listSellerPromos(sid);
    setPromoLoading(false);
    if (!res.ok) {
      setPromoError(res.error);
      setPromoRows([]);
      return;
    }
    setPromoRows(res.rows.map((r) => toSellerPromoDisplay(r)));
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadStorefront();
      void loadPromos();
    }, [loadStorefront, loadPromos])
  );

  useEffect(() => {
    void loadPromos();
  }, [session?.user?.id, loadPromos]);

  const { standardPromos, activeStandardCount, flashCampaign, bundleCampaign } = useMemo(() => {
    const standard = promoRows.filter((p) => p.promoKind === "standard");
    const activeCnt = standard.filter((p) => p.status === "Active").length;
    return {
      standardPromos: standard,
      activeStandardCount: activeCnt,
      flashCampaign: pickLiveCampaign(promoRows, "flash_sale"),
      bundleCampaign: pickLiveCampaign(promoRows, "bundle"),
    };
  }, [promoRows]);

  const flashLineBody = flashCampaign
    ? `${formatPromoDiscount(flashCampaign)} · ${flashCampaign.status} · ${flashCampaign.code} · ${usageSummary(flashCampaign)} · ends ${flashCampaign.expiry}`
    : "None running · set one in Promotions";
  const bundleLineBody = bundleCampaign
    ? `${formatPromoDiscount(bundleCampaign)} · ${bundleCampaign.status} · ${bundleCampaign.code} · ${usageSummary(bundleCampaign)} · expires ${bundleCampaign.expiry}`
    : "None set · configure in Promotions";

  const codesSummaryBody = `${activeStandardCount} active · ${standardPromos.length} total codes`;

  const storeDisplayName = storefrontLoading
    ? "…"
    : storefront?.storeName?.trim()
      ? storefront.storeName
      : isSupabaseConfigured()
        ? "—"
        : "Your store";
  const greeting = getTimeGreeting();
  const earningsMeta = `${formatInr(monthlyAmount)} this month · ${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}% growth`;

  return (
    <View style={styles.container}>
      <ScreenHeader
        variant="title"
        title={storeDisplayName}
        showNotifications
        leftAction={
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => openDrawer("seller")}
            testID="button-profile"
          >
            <Svg width={Layout.headerIconSize} height={Layout.headerIconSize} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="8" r="4" fill={Colors.light.accent} opacity={0.8} />
              <Path
                d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20"
                stroke={Colors.light.accent}
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + LayoutSpacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <DashboardWelcomeCard
          greeting={greeting}
          subtitle="Revenue, orders, and storefront activity at a glance."
          meta={earningsMeta}
        />

        {storefrontError ? (
          <Pressable onPress={() => void loadStorefront()} testID="button-storefront-retry">
            <ThemedText style={styles.analyticsError}>{storefrontError} — tap to retry</ThemedText>
          </Pressable>
        ) : null}

        <DashboardSectionTitle style="eyebrow">At a glance</DashboardSectionTitle>
        <View style={styles.keyMetricsRow}>
          <KeyMetricCard
            label="Revenue"
            value={analyticsLoading ? "…" : revenueDisplay}
            hint="paid orders"
            testID="metric-revenue"
          />
          <KeyMetricCard
            label="Orders"
            value={`${pendingOrderCount}`}
            hint="awaiting you"
            testID="metric-orders"
          />
          <KeyMetricCard
            label="Wallet"
            value={analyticsLoading ? "…" : walletDisplay}
            hint="balance"
            testID="metric-wallet"
          />
        </View>

        {analyticsError ? (
          <Pressable onPress={() => refreshAnalytics()}>
            <ThemedText style={styles.analyticsError}>
              {analyticsError} — tap to retry
            </ThemedText>
          </Pressable>
        ) : null}

        <ThemedText style={styles.secondaryHint}>
          {storeRatingDisplay} ★ store rating · {listingCount} listings · {stats.ordersThisWeek}{" "}
          orders this week
        </ThemedText>

        {!isSupabaseConfigured() ? (
          <ThemedText style={styles.promoSummaryHint}>Connect Supabase to see promo summaries here.</ThemedText>
        ) : null}

        {!isSupabaseConfigured() ? null : (
          <Pressable style={styles.softCard} testID="card-promo-summary" onPress={() => navigation.navigate("SellerPromotions")}>
            <View style={styles.cardTopRow}>
              <View style={styles.promoSummaryHeaderLeft}>
                <Feather name="tag" size={18} color={Colors.light.accent} />
                <View style={styles.promoSummaryTitles}>
                  <ThemedText style={styles.sectionTitleLg}>Offers & campaigns</ThemedText>
                  <ThemedText style={styles.cardSub}>Aligned with Promotions · same catalog</ThemedText>
                </View>
              </View>
              {promoLoading ? (
                <ActivityIndicator size="small" color={Colors.light.accent} />
              ) : (
                <ThemedText style={styles.linkText}>Manage</ThemedText>
              )}
            </View>

            {session?.user && !promoSellerId && !promoLoading ? (
              <ThemedText style={styles.promoSummaryHint}>Link seller onboarding so offers can sync.</ThemedText>
            ) : null}

            {promoError ? (
              <Pressable onPress={() => void loadPromos()} testID="button-promo-summary-retry">
                <ThemedText style={styles.promoSummaryError}>{promoError} — tap to retry</ThemedText>
              </Pressable>
            ) : promoLoading ? null : promoSellerId ? (
              <>
                <PromoSummaryRow title="Promo codes" body={codesSummaryBody} testID="promo-summary-codes" />
                <PromoSummaryRow title="Flash sale" body={flashLineBody} muted={!flashCampaign} testID="promo-summary-flash" />
                <PromoSummaryRow title="Bundle" body={bundleLineBody} muted={!bundleCampaign} isLast testID="promo-summary-bundle" />
              </>
            ) : null}
          </Pressable>
        )}

        <View style={styles.softCard}>
          <View style={styles.cardTopRow}>
            <View>
              <ThemedText style={styles.sectionTitleLg}>Weekly rhythm</ThemedText>
              <ThemedText style={styles.cardSub}>Gentle momentum, day by day</ThemedText>
            </View>
            <Pressable onPress={() => navigation.navigate("SellerAnalytics")} testID="button-view-analytics">
              <ThemedText style={styles.linkText}>Insights</ThemedText>
            </Pressable>
          </View>
          <ThemedText style={styles.revenueSum}>{formatInr(weeklyTotal)}</ThemedText>
          <ThemedText style={styles.revenueCaption}>Seven-day volume</ThemedText>
          <WeeklyRhythmChart data={weeklyRevenue} />
        </View>

        <DashboardSectionTitle style="eyebrow">Tend to your store</DashboardSectionTitle>
        <DashboardQuickActionGrid
          columns={3}
          actions={[
            {
              id: "add-product",
              icon: "plus-circle",
              label: "Add product",
              onPress: () => navigation.navigate("AddEditProductListing", {}),
              testID: "quick-action-add-product",
            },
            {
              id: "orders",
              icon: "package",
              label: "Orders",
              onPress: () => navigation.navigate("SellerOrders"),
              testID: "quick-action-orders",
            },
            {
              id: "wallet",
              icon: "credit-card",
              label: "Wallet",
              onPress: () => navigation.navigate("SellerWallet"),
              testID: "quick-action-wallet",
            },
            {
              id: "analytics",
              icon: "bar-chart-2",
              label: "Analytics",
              onPress: () => navigation.navigate("SellerAnalytics"),
              testID: "quick-action-analytics",
            },
            {
              id: "offers",
              icon: "tag",
              label: "Offers",
              onPress: () => navigation.navigate("SellerPromotions"),
              testID: "quick-action-offers",
            },
            {
              id: "edit-store",
              icon: "edit-3",
              label: "Edit store",
              onPress: () => navigation.navigate("SellerStoreCustomization"),
              testID: "quick-action-edit-store",
            },
          ]}
        />

        <View style={styles.softCard}>
          <ThemedText style={styles.sectionTitleLg}>Notes for you</ThemedText>
          <ThemedText style={styles.notesLead}>Small signals that reward your care.</ThemedText>

          {lowStockProducts.length > 0 ? (
            <Pressable
              style={styles.insightTouch}
              onPress={() => navigation.navigate("SellerProductsTab")}
              testID="button-manage-stock"
            >
              <InsightIcon name="alert-circle" />
              <View style={styles.insightBody}>
                <ThemedText style={styles.insightTitle}>Restock when you are ready</ThemedText>
                <ThemedText style={styles.insightBodyText} numberOfLines={2}>
                  {lowStockProducts.map((p) => p.name).join(" · ")} are running low.
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
            </Pressable>
          ) : null}

          {topSale ? (
            <View style={[styles.insightTouch, styles.insightQuiet]}>
              <InsightIcon name="heart" />
              <View style={styles.insightBody}>
                <ThemedText style={styles.insightTitle}>Community favorite</ThemedText>
                <ThemedText style={styles.insightBodyText}>
                  {topSale.productName} · {topSale.quantity}{" "}
                  {topSale.quantity === 1 ? "paid sale" : "paid sales"}
                </ThemedText>
              </View>
            </View>
          ) : null}

          <Pressable style={styles.insightTouch} onPress={() => navigation.navigate("SellerOrders")} testID="button-view-orders">
            <InsightIcon name="sun" />
            <View style={styles.insightBody}>
              <ThemedText style={styles.insightTitle}>Recent rhythm</ThemedText>
              <ThemedText style={styles.insightBodyText}>
                {recentOrders.length} recent {recentOrders.length === 1 ? "order" : "orders"} in your queue.
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
          </Pressable>

          <View style={[styles.insightTouch, styles.insightLast, styles.insightQuiet]}>
            <InsightIcon name="image" />
            <View style={styles.insightBody}>
              <ThemedText style={styles.insightTitle}>A gentle nudge</ThemedText>
              <ThemedText style={styles.insightBodyText}>
                Fresh photos help seekers imagine your products in their daily rituals.
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.softCard}>
          <View style={styles.cardTopRow}>
            <ThemedText style={styles.sectionTitleLg}>Recent orders</ThemedText>
            <Pressable onPress={() => navigation.navigate("SellerOrders")} testID="button-all-orders">
              <ThemedText style={styles.linkText}>See all</ThemedText>
            </Pressable>
          </View>
          {recentOrders.map((order, index) => (
            <View
              key={order.id}
              style={[styles.orderRow, index === recentOrders.length - 1 && styles.orderRowLast]}
            >
              <View style={styles.orderLeft}>
                <ThemedText style={styles.orderName}>{order.customerName}</ThemedText>
                <ThemedText style={styles.orderProduct} numberOfLines={1}>
                  {order.productName}
                </ThemedText>
              </View>
              <View style={styles.orderRight}>
                <ThemedText style={styles.orderPrice}>{formatInr(order.price)}</ThemedText>
                <View
                  style={[
                    styles.orderPill,
                    { backgroundColor: order.status === "Pending" ? "rgba(212,148,58,0.12)" : "rgba(1,50,32,0.08)" },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.orderPillText,
                      { color: order.status === "Pending" ? "#B8860B" : "#013220" },
                    ]}
                  >
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
  headerIconBtn: {
    padding: Layout.headerIconPadding,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Layout.gutter,
    paddingTop: LayoutSpacing.sm,
    gap: 0,
  },
  keyMetricsRow: {
    flexDirection: "row",
    gap: LayoutSpacing.sm,
    marginBottom: LayoutSpacing.sm,
  },
  keyMetricCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: CardTokens.radius,
    paddingVertical: LayoutSpacing.sm,
    paddingHorizontal: LayoutSpacing.xs,
    alignItems: "center",
    ...CARD_SHADOW,
  },
  keyMetricLabel: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginBottom: 6,
    textAlign: "center",
  },
  keyMetricValue: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    textAlign: "center",
  },
  keyMetricHint: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 4,
    textAlign: "center",
    opacity: 0.85,
  },
  secondaryHint: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textMuted,
    textAlign: "center",
    marginBottom: LayoutSpacing.md,
    paddingHorizontal: LayoutSpacing.sm,
    opacity: 0.95,
  },
  promoSummaryHint: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textMuted,
    textAlign: "center",
    marginBottom: LayoutSpacing.md,
    paddingHorizontal: LayoutSpacing.sm,
  },
  promoSummaryHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: LayoutSpacing.sm,
    flex: 1,
    marginRight: LayoutSpacing.sm,
  },
  promoSummaryTitles: {
    flexShrink: 1,
    gap: 4,
  },
  promoSummaryRow: {
    paddingVertical: LayoutSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}28`,
  },
  promoSummaryRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  promoSummaryTitle: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  promoSummaryBody: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
  },
  promoSummaryMuted: {
    color: Colors.light.textMuted,
  },
  promoSummaryError: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#8B3A3A",
    marginBottom: LayoutSpacing.sm,
    lineHeight: 19,
  },
  analyticsError: {
    fontSize: 13,
    color: "#8B3A3A",
    textAlign: "center",
    marginBottom: LayoutSpacing.md,
    paddingHorizontal: LayoutSpacing.lg,
  },
  softCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: CardTokens.radius,
    padding: LayoutSpacing.md,
    marginBottom: LayoutSpacing.md,
    ...CARD_SHADOW,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: LayoutSpacing.sm,
  },
  sectionTitleLg: {
    fontSize: 17,
    fontFamily: "ui-serif",
    fontWeight: "600",
    color: Colors.light.text,
  },
  cardSub: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: 2,
  },
  revenueSum: {
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: 2,
  },
  revenueCaption: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginBottom: LayoutSpacing.md,
  },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
    gap: 6,
    paddingTop: LayoutSpacing.sm,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
  },
  chartTrack: {
    flex: 1,
    width: "100%",
    maxWidth: 28,
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  chartFill: {
    width: "100%",
    borderRadius: 6,
    minHeight: 6,
  },
  chartDay: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  chartDayToday: {
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  notesLead: {
    fontSize: 13,
    fontStyle: "italic",
    fontFamily: "ui-serif",
    color: Colors.light.brown,
    marginBottom: LayoutSpacing.sm,
    lineHeight: 18,
  },
  insightTouch: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: LayoutSpacing.sm,
    paddingVertical: LayoutSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}30`,
  },
  insightQuiet: {
    paddingVertical: LayoutSpacing.sm,
  },
  insightLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  iconCircle: {
    width: ICON_WRAP,
    height: ICON_WRAP,
    borderRadius: 12,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
  },
  insightBody: {
    flex: 1,
    gap: 4,
  },
  insightTitle: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  insightBodyText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textMuted,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: LayoutSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}28`,
  },
  orderRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  orderLeft: {
    flex: 1,
    marginRight: LayoutSpacing.lg,
  },
  orderName: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  orderProduct: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 4,
  },
  orderRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  orderPrice: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  orderPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderPillText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
});
