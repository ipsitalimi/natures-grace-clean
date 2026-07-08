import React from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
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
import type { PractitionerSession, WeeklySessionPoint } from "@/data/practitionerBookings";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { formatInr, formatInrCompact } from "@/lib/formatCurrency";

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

const CHART_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function WeeklyRhythmChart({ data }: { data: WeeklySessionPoint[] }) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const todayLabel = CHART_DAY_LABELS[new Date().getDay()];
  return (
    <View style={styles.chartRow}>
      {data.map((d, i) => {
        const heightPct = maxAmount ? (d.amount / maxAmount) * 72 : 0;
        const isToday = d.day === todayLabel;
        return (
          <View key={d.day} style={styles.chartCol}>
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
            <ThemedText style={[styles.chartDay, isToday && styles.chartDayToday]}>{d.day}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function getStatusPillStyle(status: PractitionerSession["status"]) {
  switch (status) {
    case "Upcoming":
      return { bg: "rgba(212,148,58,0.12)", text: "#B8860B" };
    case "Completed":
      return { bg: "rgba(1,50,32,0.08)", text: "#013220" };
    case "Cancelled":
      return { bg: "rgba(139,58,58,0.1)", text: "#8B3A3A" };
  }
}

export default function PractitionerHomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const { openDrawer } = useDrawer();
  const { sessions, stats, practiceName, dashboard, loading, loadError, refresh } =
    usePractitionerContext();

  const upcomingSessions = sessions.filter((s) => s.status === "Upcoming");
  const recentSessions = sessions.slice(0, 3);
  const latestReview = dashboard.reviews[0];

  const monthlyAmount = dashboard.monthlyEarnings;
  const growthPct = dashboard.monthlyGrowthPct;
  const weeklyTotal = dashboard.weeklySessions.reduce((s, d) => s + d.amount, 0);

  const greeting = getTimeGreeting();
  const earningsMeta = `${formatInr(monthlyAmount)} this month · ${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}% · ${dashboard.clientsBookedToday} clients today`;

  return (
    <View style={styles.container}>
      <ScreenHeader
        variant="title"
        title={practiceName}
        showNotifications
        leftAction={
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => openDrawer("practitioner")}
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
          subtitle="Sessions, offerings, and client care at a glance."
          meta={earningsMeta}
        />

        {loading ? (
          <View style={styles.stateBanner}>
            <ActivityIndicator color={Colors.light.accent} />
            <ThemedText style={styles.stateText}>Loading your practice…</ThemedText>
          </View>
        ) : loadError ? (
          <View style={styles.stateBanner}>
            <ThemedText style={styles.errorText}>{loadError}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={() => void refresh()}>
              <ThemedText style={styles.retryText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : null}

        <DashboardSectionTitle style="eyebrow">At a glance</DashboardSectionTitle>
        <View style={styles.keyMetricsRow}>
          <KeyMetricCard
            label="Upcoming"
            value={`${stats.upcomingSessions}`}
            hint="sessions"
            testID="metric-upcoming"
          />
          <KeyMetricCard
            label="Completed"
            value={`${stats.completedThisMonth}`}
            hint="this month"
            testID="metric-completed"
          />
          <KeyMetricCard
            label="Wallet"
            value={formatInrCompact(stats.walletBalance)}
            hint="balance"
            testID="metric-wallet"
          />
        </View>

        <ThemedText style={styles.secondaryHint}>
          {dashboard.avgRating > 0 ? `${dashboard.avgRating} ★` : "No ratings yet"} practice rating ·{" "}
          {stats.totalSessions} sessions · {stats.sessionsThisWeek} this week
        </ThemedText>

        <View style={styles.softCard}>
          <View style={styles.cardTopRow}>
            <View>
              <ThemedText style={styles.sectionTitleLg}>Weekly rhythm</ThemedText>
              <ThemedText style={styles.cardSub}>Sessions held, day by day</ThemedText>
            </View>
            <Pressable onPress={() => navigation.navigate("SessionsTab")} testID="button-view-sessions">
              <ThemedText style={styles.linkText}>Schedule</ThemedText>
            </Pressable>
          </View>
          <ThemedText style={styles.revenueSum}>{weeklyTotal} sessions</ThemedText>
          <ThemedText style={styles.revenueCaption}>Seven-day volume</ThemedText>
          <WeeklyRhythmChart data={dashboard.weeklySessions} />
        </View>

        <DashboardSectionTitle style="eyebrow">Tend to your practice</DashboardSectionTitle>
        <DashboardQuickActionGrid
          columns={3}
          actions={[
            {
              id: "schedule",
              icon: "calendar",
              label: "Schedule",
              onPress: () => navigation.navigate("SessionsTab"),
              testID: "quick-action-schedule",
            },
            {
              id: "offerings",
              icon: "layers",
              label: "Offerings",
              onPress: () => navigation.navigate("SessionOfferings"),
              testID: "quick-action-offerings",
            },
            {
              id: "wallet",
              icon: "credit-card",
              label: "Wallet",
              onPress: () => navigation.navigate("PractitionerWallet"),
              testID: "quick-action-wallet",
            },
            {
              id: "analytics",
              icon: "bar-chart-2",
              label: "Analytics",
              onPress: () => navigation.navigate("PractitionerAnalytics"),
              testID: "quick-action-analytics",
            },
            {
              id: "reviews",
              icon: "star",
              label: "Reviews",
              onPress: () => navigation.navigate("PractitionerReviews"),
              testID: "quick-action-reviews",
            },
            {
              id: "profile",
              icon: "edit-3",
              label: "Edit profile",
              onPress: () => navigation.navigate("PractitionerProfile"),
              testID: "quick-action-profile",
            },
          ]}
        />

        <View style={styles.softCard}>
          <ThemedText style={styles.sectionTitleLg}>Notes for you</ThemedText>
          <ThemedText style={styles.notesLead}>Small signals that support your practice.</ThemedText>

          {upcomingSessions.length > 0 ? (
            <Pressable
              style={styles.insightTouch}
              onPress={() => navigation.navigate("SessionsTab")}
              testID="button-upcoming-sessions"
            >
              <InsightIcon name="calendar" />
              <View style={styles.insightBody}>
                <ThemedText style={styles.insightTitle}>Sessions ahead</ThemedText>
                <ThemedText style={styles.insightBodyText} numberOfLines={2}>
                  {upcomingSessions.length} upcoming — {upcomingSessions.map((s) => s.userName).join(", ")}.
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
            </Pressable>
          ) : null}

          {latestReview ? (
            <Pressable
              style={[styles.insightTouch, styles.insightQuiet]}
              onPress={() => navigation.navigate("PractitionerReviews")}
            >
              <InsightIcon name="star" />
              <View style={styles.insightBody}>
                <ThemedText style={styles.insightTitle}>New appreciation</ThemedText>
                <ThemedText style={styles.insightBodyText} numberOfLines={2}>
                  {latestReview.userName} left a {latestReview.rating}★ review — {latestReview.text}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
            </Pressable>
          ) : (
            <View style={[styles.insightTouch, styles.insightQuiet]}>
              <InsightIcon name="star" />
              <View style={styles.insightBody}>
                <ThemedText style={styles.insightTitle}>Reviews</ThemedText>
                <ThemedText style={styles.insightBodyText}>
                  No approved reviews yet. They will appear here once published.
                </ThemedText>
              </View>
            </View>
          )}

          <Pressable
            style={styles.insightTouch}
            onPress={() => navigation.navigate("SessionOfferings")}
            testID="button-manage-offerings"
          >
            <InsightIcon name="sun" />
            <View style={styles.insightBody}>
              <ThemedText style={styles.insightTitle}>Keep offerings fresh</ThemedText>
              <ThemedText style={styles.insightBodyText}>
                Review session types and pricing so clients know what to book.
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
          </Pressable>

          <View style={[styles.insightTouch, styles.insightLast, styles.insightQuiet]}>
            <InsightIcon name="heart" />
            <View style={styles.insightBody}>
              <ThemedText style={styles.insightTitle}>A gentle reminder</ThemedText>
              <ThemedText style={styles.insightBodyText}>
                Your journal tab is here whenever you need a moment of reflection between sessions.
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.softCard}>
          <View style={styles.cardTopRow}>
            <ThemedText style={styles.sectionTitleLg}>Recent sessions</ThemedText>
            <Pressable onPress={() => navigation.navigate("SessionsTab")} testID="button-all-sessions">
              <ThemedText style={styles.linkText}>See all</ThemedText>
            </Pressable>
          </View>
          {recentSessions.map((session, index) => {
            const pill = getStatusPillStyle(session.status);
            return (
              <Pressable
                key={session.id}
                style={[styles.sessionRow, index === recentSessions.length - 1 && styles.sessionRowLast]}
                onPress={() =>
                  (navigation as any).navigate("PractitionerSessionDetail", { sessionId: session.id })
                }
                testID={`recent-session-${session.id}`}
              >
                <View style={styles.sessionLeft}>
                  <ThemedText style={styles.sessionName}>{session.userName}</ThemedText>
                  <ThemedText style={styles.sessionService} numberOfLines={1}>
                    {session.service}
                  </ThemedText>
                </View>
                <View style={styles.sessionRight}>
                  <ThemedText style={styles.sessionTime}>{session.time}</ThemedText>
                  <View style={[styles.sessionPill, { backgroundColor: pill.bg }]}>
                    <ThemedText style={[styles.sessionPillText, { color: pill.text }]}>
                      {session.status}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            );
          })}
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
  },
  stateBanner: {
    alignItems: "center",
    paddingVertical: LayoutSpacing.md,
    gap: 8,
    marginBottom: LayoutSpacing.sm,
  },
  stateText: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  errorText: {
    fontSize: 14,
    color: "#8B3A3A",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.accent,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
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
    fontWeight: "700",
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
    marginBottom: LayoutSpacing.md,
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
    fontWeight: "700",
    color: Colors.light.accent,
    marginTop: 2,
  },
  revenueSum: {
    fontSize: 22,
    fontWeight: "700",
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
  chartCol: { flex: 1, alignItems: "center" },
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
    color: Colors.light.textMuted,
  },
  chartDayToday: {
    fontWeight: "700",
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
  insightQuiet: { paddingVertical: LayoutSpacing.sm },
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
  insightBody: { flex: 1, gap: 4 },
  insightTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
  },
  insightBodyText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textMuted,
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: LayoutSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}28`,
  },
  sessionRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  sessionLeft: { flex: 1, marginRight: LayoutSpacing.lg },
  sessionName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  sessionService: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 4,
  },
  sessionRight: { alignItems: "flex-end", gap: 6 },
  sessionTime: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  sessionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
