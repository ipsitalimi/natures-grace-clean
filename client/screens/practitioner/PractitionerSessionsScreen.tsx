import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import {
  practitionerSessions,
  type PractitionerSession,
} from "@/data/practitionerMockData";

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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft} />
          <ThemedText style={styles.screenTitle}>Sessions</ThemedText>
          <View style={styles.headerRight}>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => {}}
              testID="button-sessions-callback"
            >
              <Feather name="phone-call" size={20} color={Colors.light.accent} />
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => {}}
              testID="button-sessions-notifications"
            >
              <Feather name="bell" size={20} color={Colors.light.accent} />
            </Pressable>
          </View>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {practitionerSessions.map((session) => {
          const sc = getStatusColor(session.status);
          return (
            <Pressable
              key={session.id}
              style={styles.sessionCard}
              onPress={() =>
                (navigation as any).navigate("PractitionerSessionDetail", {
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
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    width: 72,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerIconButton: {
    padding: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  sessionCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
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
  cardInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  serviceText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
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
    fontFamily: "Nunito_700Bold",
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
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
});
