import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Rect, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";

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
      <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

export default function MonthlyOverviewScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Monthly Overview</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monthHeader}>
          <CalendarIcon size={20} color={Colors.light.accent} />
          <ThemedText style={styles.monthText}>{currentMonth}</ThemedText>
        </View>

        <View style={styles.summaryCard}>
          <ThemedText style={styles.summaryTitle}>Your Reflection Journey</ThemedText>
          <ThemedText style={styles.summaryText}>
            This month has been a time of quiet growth. You've taken meaningful moments to pause, reflect, and appreciate the simple joys in life.
          </ThemedText>
        </View>

        <View style={styles.statsGrid}>
          <StatBlock
            icon={<PenIcon size={20} color={Colors.light.accent} />}
            value="8"
            label="Entries Written"
          />
          <StatBlock
            icon={<HeartIcon size={20} color="#E8A87C" />}
            value="12"
            label="Gratitudes"
            color="#E8A87C"
          />
          <StatBlock
            icon={<SmileIcon size={20} color="#85B7A0" />}
            value="5"
            label="Peaceful Days"
            color="#85B7A0"
          />
          <StatBlock
            icon={<CalendarIcon size={20} color="#9A8BC4" />}
            value="3"
            label="Week Streak"
            color="#9A8BC4"
          />
        </View>

        <View style={styles.insightCard}>
          <ThemedText style={styles.insightTitle}>This Month's Insight</ThemedText>
          <ThemedText style={styles.insightText}>
            "Your entries show a growing appreciation for nature and quiet moments. You've mentioned the outdoors in 5 of your entries this month."
          </ThemedText>
        </View>

        <View style={styles.encouragementCard}>
          <ThemedText style={styles.encouragementText}>
            Keep nurturing this practice. Each moment of reflection adds to your inner peace.
          </ThemedText>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 8,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerIconButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
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
    gap: 12,
    marginBottom: Spacing.lg,
  },
  statBlock: {
    width: "47%",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
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
