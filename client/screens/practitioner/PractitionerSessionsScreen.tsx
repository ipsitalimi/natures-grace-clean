import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import AppHeader from "@/components/AppHeader";
import PractitionerDrawer from "@/components/PractitionerDrawer";
import type { PractitionerSession } from "@/data/practitionerBookings";
import { usePractitionerContext } from "@/context/PractitionerContext";

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

export default function PractitionerSessionsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { sessions, loading } = usePractitionerContext();

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
          <ThemedText style={styles.pageTitle}>Sessions</ThemedText>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={Colors.light.accent} />
            <ThemedText style={styles.emptyText}>Loading sessions…</ThemedText>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={32} color={Colors.light.textMuted} />
            <ThemedText style={styles.emptyTitle}>No sessions yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              Upcoming and completed bookings will appear here.
            </ThemedText>
          </View>
        ) : (
        sessions.map((session) => {
          const sc = getStatusColor(session.status);
          return (
            <Pressable
              key={session.id}
              style={styles.sessionCard}
              onPress={() =>
                navigation.navigate("PractitionerSessionDetail", {
                  sessionId: session.id,
                })
              }
              testID={`session-card-${session.id}`}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <View style={styles.avatarCircle}>
                    <Feather name="user" size={18} color={Colors.light.accent} />
                  </View>
                  <View style={styles.cardInfo}>
                    <ThemedText style={styles.userName}>{session.userName}</ThemedText>
                    <ThemedText style={styles.serviceText}>{session.service}</ThemedText>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <ThemedText style={[styles.statusText, { color: sc.text }]}>
                    {session.status}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.metaItem}>
                  <Feather name="calendar" size={13} color={Colors.light.textMuted} />
                  <ThemedText style={styles.metaText}>{session.date}</ThemedText>
                </View>
                <View style={styles.metaItem}>
                  <Feather name="clock" size={13} color={Colors.light.textMuted} />
                  <ThemedText style={styles.metaText}>{session.time}</ThemedText>
                </View>
                <View style={styles.metaItem}>
                  <Feather name="activity" size={13} color={Colors.light.textMuted} />
                  <ThemedText style={styles.metaText}>{session.duration}</ThemedText>
                </View>
              </View>
            </Pressable>
          );
        })
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
  sessionCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cardTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardInfo: { flex: 1 },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  serviceText: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardBottom: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
});
