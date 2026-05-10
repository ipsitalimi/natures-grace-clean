import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import { mockSessions, SessionData } from "@/data/mockSessions";

type RootStackParamList = {
  SessionDetail: { sessionId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function getStatusColor(status: SessionData["status"]): string {
  switch (status) {
    case "Completed":
      return Colors.light.accent;
    case "Upcoming":
      return "#E5A93B";
    case "Cancelled":
      return "#D4534A";
    default:
      return Colors.light.textSecondary;
  }
}

function SessionCard({ session, onPress }: { session: SessionData; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress} testID={`session-card-${session.id}`}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <ThemedText style={styles.practitionerName}>{session.practitionerName}</ThemedText>
          <ThemedText style={styles.serviceType}>{session.serviceType}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(session.status)}15` }]}>
          <ThemedText style={[styles.statusText, { color: getStatusColor(session.status) }]}>
            {session.status}
          </ThemedText>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <ThemedText style={styles.cardDetail}>{session.date}</ThemedText>
        <ThemedText style={styles.cardDot}> </ThemedText>
        <ThemedText style={styles.cardDetail}>{session.duration}</ThemedText>
      </View>
    </Pressable>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: 80, marginTop: 6 }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { width: 120, marginTop: 8 }]} />
    </View>
  );
}

export default function SessionHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const sessions = mockSessions;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

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
        <ThemedText style={styles.pageTitle}>Session History</ThemedText>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : sessions.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onPress={() => navigation.navigate("SessionDetail", { sessionId: session.id })}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="clock" size={36} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>Nothing here yet.</ThemedText>
        </View>
      )}
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
    gap: 10,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    gap: 10,
    paddingTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  practitionerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  serviceType: {
    fontSize: 14,
    color: Colors.light.accent,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardDetail: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  cardDot: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginHorizontal: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  skeletonLine: {
    height: 14,
    width: 140,
    borderRadius: 6,
    backgroundColor: Colors.light.backgroundSecondary,
  },
});
