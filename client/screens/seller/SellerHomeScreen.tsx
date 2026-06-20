import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import AppHeader from "@/components/AppHeader";
import SellerDrawer from "@/components/SellerDrawer";
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

const ICON_SIZE = 22;
const ICON_WRAP = 48;
const CARD_RADIUS = 16;
const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 3,
  elevation: 2,
};

function InsightIcon({ name }: { name: React.ComponentProps<typeof Feather>["name"] }) {
  return (
    <View style={styles.iconCircle}>
      <Feather name={name} size={ICON_SIZE} color={Colors.light.accent} />
    </View>
  );
}

/** Matches CommunityScreen heroBanner / heroOverlay — dark green card, white copy. */
function SellerHeroCard({
  monthlyAmount,
  growthPct,
}: {
  monthlyAmount: number;
  growthPct: number;
}) {
  return (
    <View style={styles.sellerHeroBanner}>
      <View style={styles.sellerHeroOverlay}>
        <ThemedText style={styles.sellerHeroEyebrow}>Earnings this month</ThemedText>
        <ThemedText style={styles.sellerHeroAmount}>{formatInr(monthlyAmount)}</ThemedText>
        <View style={styles.sellerHeroGrowthRow}>
          <Feather
            name={growthPct >= 0 ? "trending-up" : "trending-down"}
            size={18}
            color="#FFFFFF"
          />
          <ThemedText style={styles.sellerHeroGrowthText}>
            {growthPct >= 0 ? "+" : ""}
            {growthPct.toFixed(1)}% from last month
          </ThemedText>
        </View>
        <ThemedText style={styles.sellerHeroClosing}>Your wellness store is growing beautifully.</ThemedText>
      </View>
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

function QuickActionCard({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
      onPress={onPress}
      testID={testID}
    >
      <View style={styles.quickIconWrap}>
        <Feather name={icon} size={ICON_SIZE} color={Colors.light.accent} />
      </View>
      <ThemedText style={styles.quickLabel}>{label}</ThemedText>
    </Pressable>
  );
}

export default function SellerHomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const [drawerVisible, setDrawerVisible] = useState(false);
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

  return (
    <View style={styles.container}>
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <AppHeader showLogo={false} onProfilePress={() => setDrawerVisible(true)} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sellerTitleSection}>
          <ThemedText
            style={[
              styles.sellerPageTitle,
              !storefrontLoading && storefront && !storefront.storeName ? styles.sellerTitleMuted : undefined,
            ]}
            testID="text-seller-store-name"
          >
            {storefrontLoading
              ? "…"
              : storefront?.storeName?.trim()
                ? storefront.storeName
                : isSupabaseConfigured()
                  ? "—"
                  : "Your store"}
          </ThemedText>
        </View>

        {storefrontError ? (
          <Pressable onPress={() => void loadStorefront()} testID="button-storefront-retry">
            <ThemedText style={styles.analyticsError}>{storefrontError} — tap to retry</ThemedText>
          </Pressable>
        ) : null}

        <SellerHeroCard monthlyAmount={monthlyAmount} growthPct={growthPct} />

        <ThemedText style={styles.sectionEyebrow}>At a glance</ThemedText>
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
          <Pressable style={[styles.softCard, CARD_SHADOW]} testID="card-promo-summary" onPress={() => navigation.navigate("SellerPromotions")}>
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

        <View style={[styles.softCard, CARD_SHADOW]}>
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

        <ThemedText style={styles.sectionEyebrow}>Tend to your store</ThemedText>
        <View style={styles.quickGrid}>
          <View style={styles.quickRow}>
            <QuickActionCard
              icon="plus-circle"
              label="Add product"
              onPress={() => navigation.navigate("AddEditProductListing", {})}
              testID="quick-action-add-product"
            />
            <QuickActionCard
              icon="package"
              label="Orders"
              onPress={() => navigation.navigate("SellerOrders")}
              testID="quick-action-orders"
            />
            <QuickActionCard
              icon="credit-card"
              label="Wallet"
              onPress={() => navigation.navigate("SellerWallet")}
              testID="quick-action-wallet"
            />
          </View>
          <View style={styles.quickRow}>
            <QuickActionCard
              icon="bar-chart-2"
              label="Analytics"
              onPress={() => navigation.navigate("SellerAnalytics")}
              testID="quick-action-analytics"
            />
            <QuickActionCard
              icon="tag"
              label="Offers"
              onPress={() => navigation.navigate("SellerPromotions")}
              testID="quick-action-offers"
            />
            <QuickActionCard
              icon="edit-3"
              label="Edit store"
              onPress={() => navigation.navigate("SellerStoreCustomization")}
              testID="quick-action-edit-store"
            />
          </View>
        </View>

        <View style={[styles.softCard, CARD_SHADOW]}>
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

        <View style={[styles.softCard, CARD_SHADOW]}>
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
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: 0,
  },
  /** Same as CommunityScreen title / titleSection */
  sellerTitleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg + 8,
  },
  sellerPageTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  /** Same treatment as CommunityScreen heroBanner + heroOverlay */
  sellerHeroBanner: {
    borderRadius: 16,
    backgroundColor: Colors.light.accent,
    overflow: "hidden",
    marginBottom: Spacing["2xl"],
  },
  sellerHeroOverlay: {
    backgroundColor: "rgba(6, 46, 3, 0.7)",
    padding: Spacing.xl,
    alignItems: "center",
  },
  sellerHeroEyebrow: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.88)",
    textAlign: "center",
    marginBottom: 10,
  },
  sellerHeroAmount: {
    fontSize: 28,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  sellerHeroGrowthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: Spacing.lg,
  },
  sellerHeroGrowthText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  sellerHeroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  sellerHeroClosing: {
    fontSize: 14,
    fontFamily: "ui-serif",
    fontStyle: "italic",
    color: "rgba(255, 255, 255, 0.92)",
    textAlign: "center",
    lineHeight: 21,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    letterSpacing: 1.5,
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  keyMetricsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  keyMetricCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
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
    fontSize: 20,
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
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    opacity: 0.95,
  },
  promoSummaryHint: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textMuted,
    textAlign: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  promoSummaryHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  promoSummaryTitles: {
    flexShrink: 1,
    gap: 4,
  },
  promoSummaryRow: {
    paddingVertical: Spacing.md,
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
    marginBottom: Spacing.sm,
    lineHeight: 19,
  },
  sellerTitleMuted: {
    fontStyle: "italic",
    color: Colors.light.textSecondary,
  },
  analyticsError: {
    fontSize: 13,
    color: "#8B3A3A",
    textAlign: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  softCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: CARD_RADIUS,
    padding: Spacing.xl,
    marginBottom: Spacing["2xl"],
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  sectionTitleLg: {
    fontSize: 20,
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
    fontSize: 28,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: 4,
  },
  revenueCaption: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginBottom: Spacing.xl,
  },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
    gap: 6,
    paddingTop: Spacing.sm,
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
  quickGrid: {
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    gap: 10,
    ...CARD_SHADOW,
  },
  quickCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  quickIconWrap: {
    width: ICON_WRAP,
    height: ICON_WRAP,
    borderRadius: 16,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.text,
    textAlign: "center",
    lineHeight: 15,
  },
  notesLead: {
    fontSize: 14,
    fontStyle: "italic",
    fontFamily: "ui-serif",
    color: Colors.light.brown,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  insightTouch: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}30`,
  },
  insightQuiet: {
    paddingVertical: Spacing.lg,
  },
  insightLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  iconCircle: {
    width: ICON_WRAP,
    height: ICON_WRAP,
    borderRadius: 16,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
  },
  insightBody: {
    flex: 1,
    gap: 4,
  },
  insightTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  insightBodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textMuted,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}28`,
  },
  orderRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  orderLeft: {
    flex: 1,
    marginRight: Spacing.lg,
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
