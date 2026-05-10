import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Pressable } from "react-native";

const engagementData = [
  { day: "Mon", height: 60 },
  { day: "Tue", height: 75 },
  { day: "Wed", height: 85 },
  { day: "Thu", height: 70 },
  { day: "Fri", height: 90 },
  { day: "Sat", height: 95 },
  { day: "Sun", height: 65 },
];

const categories = [
  { name: "Healings", sessions: 342 },
  { name: "Counseling", sessions: 287 },
  { name: "Spiritual Guidance", sessions: 198 },
  { name: "Therapies", sessions: 165 },
  { name: "Diet & Nutrition", sessions: 134 },
  { name: "Financial Guidance", sessions: 98 },
];

const moodData = [
  { mood: "Peaceful", percent: 38, color: "#7BA68A" },
  { mood: "Grateful", percent: 28, color: "#C4A97A" },
  { mood: "Hopeful", percent: 22, color: "#7AAEC4" },
  { mood: "Anxious", percent: 12, color: "#C47A7A" },
];

export default function AdminAnalyticsScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const maxSessions = categories[0].sessions;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard} testID="button-back-dashboard">
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Analytics</ThemedText>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Feather name="users" size={20} color={Colors.light.accent} />
          <ThemedText style={styles.statValue}>1,247</ThemedText>
          <ThemedText style={styles.statLabel}>Total Users</ThemedText>
        </View>
        <View style={styles.statCard}>
          <Feather name="activity" size={20} color={Colors.light.accent} />
          <ThemedText style={styles.statValue}>834</ThemedText>
          <ThemedText style={styles.statLabel}>Active This Week</ThemedText>
        </View>
        <View style={styles.statCard}>
          <Feather name="user-plus" size={20} color={Colors.light.accent} />
          <ThemedText style={styles.statValue}>156</ThemedText>
          <ThemedText style={styles.statLabel}>New This Month</ThemedText>
        </View>
        <View style={styles.statCard}>
          <Feather name="clock" size={20} color={Colors.light.accent} />
          <ThemedText style={styles.statValue}>42 min</ThemedText>
          <ThemedText style={styles.statLabel}>Avg Session</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.subSectionTitle}>Engagement Trends</ThemedText>
      <View style={styles.chartCard}>
        <View style={styles.chartContainer}>
          {engagementData.map((item) => (
            <View key={item.day} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    { height: `${item.height}%`, backgroundColor: Colors.light.accent },
                  ]}
                />
              </View>
              <ThemedText style={styles.barLabel}>{item.day}</ThemedText>
            </View>
          ))}
        </View>
      </View>

      <ThemedText style={styles.subSectionTitle}>Popular Categories</ThemedText>
      <View style={styles.listCard}>
        {categories.map((cat, index) => (
          <View key={cat.name} style={styles.categoryRow}>
            <View style={styles.categoryRank}>
              <ThemedText style={styles.rankText}>{index + 1}</ThemedText>
            </View>
            <View style={styles.categoryInfo}>
              <ThemedText style={styles.categoryName}>{cat.name}</ThemedText>
              <View style={styles.categoryBarWrapper}>
                <View
                  style={[
                    styles.categoryBar,
                    { width: `${(cat.sessions / maxSessions) * 100}%` },
                  ]}
                />
              </View>
            </View>
            <ThemedText style={styles.categoryCount}>{cat.sessions}</ThemedText>
          </View>
        ))}
      </View>

      <ThemedText style={styles.subSectionTitle}>Mood Trends</ThemedText>
      <View style={styles.listCard}>
        {moodData.map((item) => (
          <View key={item.mood} style={styles.moodRow}>
            <View style={styles.moodLabelRow}>
              <View style={[styles.moodDot, { backgroundColor: item.color }]} />
              <ThemedText style={styles.moodName}>{item.mood}</ThemedText>
              <ThemedText style={styles.moodPercent}>{item.percent}%</ThemedText>
            </View>
            <View style={styles.moodBarWrapper}>
              <View
                style={[
                  styles.moodBar,
                  { width: `${item.percent}%`, backgroundColor: item.color },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      <ThemedText style={styles.subSectionTitle}>Revenue Summary</ThemedText>
      <View style={styles.revenueCard}>
        <View style={styles.revenueRow}>
          <ThemedText style={styles.revenueLabel}>Total Revenue</ThemedText>
          <ThemedText style={styles.revenueValue}>Rs. 2,45,800</ThemedText>
        </View>
        <View style={styles.revenueDivider} />
        <View style={styles.revenueRow}>
          <ThemedText style={styles.revenueLabel}>This Month</ThemedText>
          <ThemedText style={styles.revenueValue}>Rs. 38,500</ThemedText>
        </View>
        <View style={styles.revenueDivider} />
        <View style={styles.revenueRow}>
          <ThemedText style={styles.revenueLabel}>Avg per Session</ThemedText>
          <ThemedText style={styles.revenueValue}>Rs. 1,200</ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontFamily: "Nunito_400Regular",
  },
  chartCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 160,
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    height: "100%",
  },
  barWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    width: "70%",
    borderRadius: 4,
    minHeight: 8,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 6,
  },
  listCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: 14,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${Colors.light.accent}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  categoryInfo: {
    flex: 1,
    gap: 4,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  categoryBarWrapper: {
    height: 6,
    backgroundColor: `${Colors.light.accent}15`,
    borderRadius: 3,
  },
  categoryBar: {
    height: 6,
    backgroundColor: Colors.light.accent,
    borderRadius: 3,
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    minWidth: 36,
    textAlign: "right",
  },
  moodRow: {
    gap: 6,
  },
  moodLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  moodName: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    flex: 1,
  },
  moodPercent: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  moodBarWrapper: {
    height: 8,
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: 4,
    marginLeft: 18,
  },
  moodBar: {
    height: 8,
    borderRadius: 4,
  },
  revenueCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  revenueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  revenueLabel: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  revenueDivider: {
    height: 1,
    backgroundColor: Colors.light.divider,
    opacity: 0.3,
  },
});
