import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import AppHeader from "@/components/AppHeader";
import PractitionerDrawer from "@/components/PractitionerDrawer";
import type { PractitionerSession, WeeklySessionPoint } from "@/data/practitionerBookings";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { formatInr, formatInrCompact } from "@/lib/formatCurrency";

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

function PractitionerHeroCard({
  monthlyAmount,
  growthPct,
  clientsToday,
}: {
  monthlyAmount: number;
  growthPct: number;
  clientsToday: number;
}) {
  return (
    <View style={styles.heroBanner}>
      <View style={styles.heroOverlay}>
        <ThemedText style={styles.heroEyebrow}>Earnings this month</ThemedText>
        <ThemedText style={styles.heroAmount}>{formatInr(monthlyAmount)}</ThemedText>
        <View style={styles.heroGrowthRow}>
          <Feather name="trending-up" size={18} color="#FFFFFF" />
          <ThemedText style={styles.heroGrowthText}>
            {growthPct >= 0 ? "+" : ""}
            {growthPct.toFixed(1)}% from last month
          </ThemedText>
        </View>
        <ThemedText style={styles.heroSubtitle}>
          {clientsToday} clients booked sessions with you today.
        </ThemedText>
        <ThemedText style={styles.heroClosing}>Your healing practice is growing beautifully.</ThemedText>
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
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { sessions, stats, practiceName, dashboard } = usePractitionerContext();

  const upcomingSessions = sessions.filter((s) => s.status === "Upcoming");
  const recentSessions = sessions.slice(0, 3);
  const latestReview = dashboard.reviews[0];

  const monthlyAmount = dashboard.monthlyEarnings;
  const growthPct = dashboard.monthlyGrowthPct;
  const weeklyTotal = dashboard.weeklySessions.reduce((s, d) => s + d.amount, 0);

  return (
    <View style={styles.container}>
      <PractitionerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <AppHeader showLogo={false} onProfilePress={() => setDrawerVisible(true)} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <ThemedText style={styles.pageTitle}>{practiceName}</ThemedText>
        </View>

        <PractitionerHeroCard
          monthlyAmount={monthlyAmount}
          growthPct={growthPct}
          clientsToday={dashboard.clientsBookedToday}
        />

        <ThemedText style={styles.sectionEyebrow}>At a glance</ThemedText>
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

        <View style={[styles.softCard, CARD_SHADOW]}>
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

        <ThemedText style={styles.sectionEyebrow}>Tend to your practice</ThemedText>
        <View style={styles.quickGrid}>
          <View style={styles.quickRow}>
            <QuickActionCard
              icon="calendar"
              label="Schedule"
              onPress={() => navigation.navigate("SessionsTab")}
              testID="quick-action-schedule"
            />
            <QuickActionCard
              icon="layers"
              label="Offerings"
              onPress={() => navigation.navigate("SessionOfferings")}
              testID="quick-action-offerings"
            />
            <QuickActionCard
              icon="credit-card"
              label="Wallet"
              onPress={() => navigation.navigate("PractitionerWallet")}
              testID="quick-action-wallet"
            />
          </View>
          <View style={styles.quickRow}>
            <QuickActionCard
              icon="bar-chart-2"
              label="Analytics"
              onPress={() => navigation.navigate("PractitionerAnalytics")}
              testID="quick-action-analytics"
            />
            <QuickActionCard
              icon="star"
              label="Reviews"
              onPress={() => navigation.navigate("MyReviews")}
              testID="quick-action-reviews"
            />
            <QuickActionCard
              icon="edit-3"
              label="Edit profile"
              onPress={() => navigation.navigate("PractitionerProfile")}
              testID="quick-action-profile"
            />
          </View>
        </View>

        <View style={[styles.softCard, CARD_SHADOW]}>
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
            <View style={[styles.insightTouch, styles.insightQuiet]}>
              <InsightIcon name="star" />
              <View style={styles.insightBody}>
                <ThemedText style={styles.insightTitle}>New appreciation</ThemedText>
                <ThemedText style={styles.insightBodyText} numberOfLines={2}>
                  {latestReview.userName} left a {latestReview.rating}★ review — {latestReview.text}
                </ThemedText>
              </View>
            </View>
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

        <View style={[styles.softCard, CARD_SHADOW]}>
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
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg + 8,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  heroBanner: {
    borderRadius: 16,
    backgroundColor: Colors.light.accent,
    overflow: "hidden",
    marginBottom: Spacing["2xl"],
  },
  heroOverlay: {
    backgroundColor: "rgba(6, 46, 3, 0.7)",
    padding: Spacing.xl,
    alignItems: "center",
  },
  heroEyebrow: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.88)",
    textAlign: "center",
    marginBottom: 10,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  heroGrowthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: Spacing.lg,
  },
  heroGrowthText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  heroClosing: {
    fontSize: 14,
    fontFamily: "ui-serif",
    fontStyle: "italic",
    color: "rgba(255, 255, 255, 0.92)",
    textAlign: "center",
    lineHeight: 21,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
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
    marginBottom: Spacing["2xl"],
    paddingHorizontal: Spacing.sm,
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
    fontWeight: "700",
    color: Colors.light.accent,
    marginTop: 2,
  },
  revenueSum: {
    fontSize: 28,
    fontWeight: "700",
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
  insightQuiet: { paddingVertical: Spacing.lg },
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
  insightBody: { flex: 1, gap: 4 },
  insightTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  insightBodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textMuted,
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}28`,
  },
  sessionRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  sessionLeft: { flex: 1, marginRight: Spacing.lg },
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
