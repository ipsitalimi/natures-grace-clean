import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import AppHeader from "@/components/AppHeader";
import PractitionerDrawer from "@/components/PractitionerDrawer";
import {
  practitionerSessions,
  practitionerEarnings,
  type PractitionerSession,
} from "@/data/practitionerMockData";
import scheduleIcon from "../../../assets/images/icons/pract-schedule-icon.png";
import profileIcon from "../../../assets/images/icons/pract-profile-icon.png";
import earningsIcon from "../../../assets/images/icons/pract-earnings-icon.png";
import reviewsIcon from "../../../assets/images/icons/pract-reviews-icon.png";

function ActionIcon({ source, size = 52 }: { source: any; size?: number }) {
  return (
    <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
  );
}

function getStatusColor(status: PractitionerSession["status"]) {
  switch (status) {
    case "Upcoming":
      return { bg: "rgba(1, 50, 32, 0.12)", text: "#013220" };
    case "Completed":
      return { bg: "rgba(1, 50, 32, 0.08)", text: "#4A5A2B" };
    case "Cancelled":
      return { bg: "rgba(139, 58, 58, 0.1)", text: "#8B3A3A" };
  }
}

function SessionCard({ session, onPress }: { session: PractitionerSession; onPress: () => void }) {
  const sc = getStatusColor(session.status);
  return (
    <Pressable style={styles.sessionCard} onPress={onPress} testID={`session-card-${session.id}`}>
      <View style={styles.sessionCardTop}>
        <ThemedText style={styles.sessionUserName}>{session.userName}</ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <ThemedText style={[styles.statusText, { color: sc.text }]}>{session.status}</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.sessionService}>{session.service}</ThemedText>
      <View style={styles.sessionMeta}>
        <Feather name="clock" size={12} color={Colors.light.textMuted} />
        <ThemedText style={styles.sessionMetaText}>
          {session.time} - {session.duration}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function ActionCard({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
      onPress={onPress}
    >
      <View style={styles.actionIconWrap}>{icon}</View>
      <ThemedText style={styles.actionLabel}>{label}</ThemedText>
      {value ? <ThemedText style={styles.actionValue}>{value}</ThemedText> : null}
    </Pressable>
  );
}

export default function PractitionerHomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const todaySessions = practitionerSessions.filter((s) => s.status === "Upcoming").slice(0, 3);

  return (
    <View style={styles.container}>
      <PractitionerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <AppHeader onProfilePress={() => setDrawerVisible(true)} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <ThemedText style={styles.appTitle}>Nature's Grace</ThemedText>
          <ThemedText style={styles.roleLabel}>Practitioner</ThemedText>
        </View>

        <View style={styles.greetingSection}>
          <ThemedText style={styles.greetingText}>
            Welcome back, <ThemedText style={styles.nameHighlight}>Dr. Ananya</ThemedText>
          </ThemedText>
          <ThemedText style={styles.subGreeting}>Ready to make a difference today.</ThemedText>
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Today's Sessions</ThemedText>
          <Pressable onPress={() => (navigation as any).navigate("SessionsTab")}>
            <ThemedText style={styles.viewAllText}>View All</ThemedText>
          </Pressable>
        </View>

        {todaySessions.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionsCarousel}>
            {todaySessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onPress={() => (navigation as any).navigate("SessionsTab")}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>No sessions scheduled for today</ThemedText>
          </View>
        )}

        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>

        <View style={styles.actionsGrid}>
          <View style={styles.actionsRow}>
            <ActionCard
              icon={<ActionIcon source={scheduleIcon} />}
              label="View Schedule"
              onPress={() => (navigation as any).navigate("SessionsTab")}
            />
            <ActionCard
              icon={<ActionIcon source={profileIcon} />}
              label="My Profile"
              onPress={() => (navigation as any).navigate("PractitionerProfile" as never)}
            />
          </View>
          <View style={styles.actionsRow}>
            <ActionCard
              icon={<ActionIcon source={earningsIcon} />}
              label="Earnings"
              value={`Rs. ${practitionerEarnings.thisMonth.toLocaleString()}`}
            />
            <ActionCard
              icon={<ActionIcon source={reviewsIcon} />}
              label="Reviews"
              value={`${practitionerEarnings.avgRating} avg`}
            />
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  appTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
  },
  roleLabel: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  greetingSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  greetingText: {
    fontSize: 20,
    color: Colors.light.text,
    fontFamily: "ui-serif",
    marginBottom: 2,
  },
  nameHighlight: {
    fontWeight: "600",
    fontStyle: "italic",
    color: Colors.light.accent,
    fontSize: 20,
  },
  subGreeting: {
    fontSize: 15,
    color: Colors.light.textMuted,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: Spacing.md,
  },
  sessionsCarousel: {
    marginBottom: Spacing.xl,
  },
  sessionCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    width: 220,
    marginRight: Spacing.md,
  },
  sessionCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  sessionUserName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  sessionService: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: Spacing.xs,
  },
  sessionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sessionMetaText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  emptyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  actionsGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
  },
  actionIconWrap: {
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: 2,
  },
  actionValue: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
  },
});
