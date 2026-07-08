import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Rect, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { Colors, Spacing } from "@/constants/theme";
import { useJournal } from "@/context/JournalContext";
import { useGratitude } from "@/context/GratitudeContext";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { parseMoodsFromStorage } from "@/lib/journalMoods";

function CalendarIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" />
      <Path d="M16 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M8 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M3 10H21" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}

function PenIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 3L21 8L8 21H3V16L16 3Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HeartIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5.08C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SmileIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />
      <Path d="M8 14C8.5 15.5 10 17 12 17C14 17 15.5 15.5 16 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="9" cy="9" r="1.5" fill={color} />
      <Circle cx="15" cy="9" r="1.5" fill={color} />
    </Svg>
  );
}

interface StatBlockProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  color?: string;
}

function StatBlock({ icon, value, label, color = Colors.light.accent }: StatBlockProps) {
  return (
    <View style={[styles.statBlock, { backgroundColor: `${color}10` }]}>
      <View style={styles.statIcon}>{icon}</View>
      <ThemedText
        style={[styles.statValue, { color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        maxFontSizeMultiplier={1.2}
      >
        {value}
      </ThemedText>
      <ThemedText style={styles.statLabel} numberOfLines={2}>
        {label}
      </ThemedText>
    </View>
  );
}

function isInCurrentMonth(dateISO: string): boolean {
  const d = new Date(dateISO + "T12:00:00");
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function MonthlyOverviewScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { scrollPaddingBottom } = useLayoutInsets(tabBarHeight);
  const navigation = useNavigation();
  const { entries, getStreak, journalLoading, journalError } = useJournal();
  const { myGratitudes, gratitudeLoading, gratitudeError } = useGratitude();

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const monthStats = useMemo(() => {
    const monthEntries = entries.filter((e) => isInCurrentMonth(e.dateISO));
    const monthGratitudes = myGratitudes.filter((g) => isInCurrentMonth(g.dateISO));
    const peacefulDays = new Set(
      monthEntries
        .filter((e) => parseMoodsFromStorage(e.mood).includes("Peaceful"))
        .map((e) => e.dateISO)
    ).size;
    return {
      entries: monthEntries.length,
      gratitudes: monthGratitudes.length,
      peacefulDays,
      streak: getStreak(),
    };
  }, [entries, myGratitudes, getStreak]);

  const loading = journalLoading || gratitudeLoading;
  const loadError = journalError || gratitudeError;

  return (
    <View style={styles.container}>
      <BackHeader />

      <BelowHeaderTitle>Monthly Overview</BelowHeaderTitle>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monthHeader}>
          <CalendarIcon size={20} color={Colors.light.accent} />
          <ThemedText style={styles.monthText}>{currentMonth}</ThemedText>
        </View>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color={Colors.light.accent} />
            <ThemedText style={styles.loadingText}>Loading your overview…</ThemedText>
          </View>
        ) : loadError ? (
          <View style={styles.loadingBlock}>
            <ThemedText style={styles.loadingText}>{loadError}</ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryTitle}>Your Reflection Journey</ThemedText>
              <ThemedText style={styles.summaryText}>
                {monthStats.entries > 0 || monthStats.gratitudes > 0
                  ? `You've written ${monthStats.entries} journal ${monthStats.entries === 1 ? "entry" : "entries"} and logged ${monthStats.gratitudes} ${monthStats.gratitudes === 1 ? "gratitude" : "gratitudes"} this month.`
                  : "Start journaling or logging gratitude to see your monthly journey here."}
              </ThemedText>
            </View>

            <View style={styles.statsGrid}>
              <StatBlock
                icon={<PenIcon size={20} color={Colors.light.accent} />}
                value={String(monthStats.entries)}
                label="Entries Written"
              />
              <StatBlock
                icon={<HeartIcon size={20} color="#E8A87C" />}
                value={String(monthStats.gratitudes)}
                label="Gratitudes"
                color="#E8A87C"
              />
              <StatBlock
                icon={<SmileIcon size={20} color="#85B7A0" />}
                value={String(monthStats.peacefulDays)}
                label="Peaceful Days"
                color="#85B7A0"
              />
              <StatBlock
                icon={<CalendarIcon size={20} color="#9A8BC4" />}
                value={String(monthStats.streak)}
                label="Day Streak"
                color="#9A8BC4"
              />
            </View>

            {monthStats.entries > 0 ? (
              <View style={styles.insightCard}>
                <ThemedText style={styles.insightTitle}>This Month's Insight</ThemedText>
                <ThemedText style={styles.insightText}>
                  {monthStats.peacefulDays > 0
                    ? `You marked ${monthStats.peacefulDays} peaceful ${monthStats.peacefulDays === 1 ? "day" : "days"} in your journal this month.`
                    : "Your mood tags will appear here as you add entries with how you're feeling."}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.encouragementCard}>
              <ThemedText style={styles.encouragementText}>
                Keep nurturing this practice. Each moment of reflection adds to your inner peace.
              </ThemedText>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.lg,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  loadingBlock: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: Colors.light.accent,
    borderRadius: 16,
    padding: 20,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: "rgba(255, 255, 255, 0.9)",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    columnGap: 12,
    marginBottom: Spacing.lg,
  },
  statBlock: {
    width: "48%",
    minWidth: 140,
    flexGrow: 1,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
    lineHeight: 34,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
    textAlign: "center",
    width: "100%",
  },
  insightCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.light.text,
    fontStyle: "italic",
  },
  encouragementCard: {
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: 14,
    padding: 16,
  },
  encouragementText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.light.text,
    textAlign: "center",
    fontStyle: "italic",
  },
});
