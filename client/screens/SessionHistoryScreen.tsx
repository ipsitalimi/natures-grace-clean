import React, { useCallback, useState } from "react";
import { View, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout, Card } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import type { UserSessionHistory } from "@/data/practitionerBookings";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

type RootStackParamList = {
  SessionDetail: { sessionId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function getStatusColor(status: UserSessionHistory["status"]): string {
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

function SessionCard({ session, onPress }: { session: UserSessionHistory; onPress: () => void }) {
  return (
    <Card onPress={onPress} testID={`session-card-${session.id}`}>
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
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: 80, marginTop: LayoutSpacing.xs }]} />
      <View style={[styles.skeletonLine, { width: 120, marginTop: LayoutSpacing.sm }]} />
    </Card>
  );
}

export default function SessionHistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userSessions, loading: practitionerLoading, loadError, refresh } = usePractitionerContext();
  const sessions = userSessions;
  const loading = practitionerLoading;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <PageLayout
      title="Session History"
      titleInHeader
      header="back"
      scrollViewProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />,
      }}
      contentContainerStyle={styles.list}
    >
      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : loadError ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={36} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>{loadError}</ThemedText>
          <Pressable style={styles.retryBtn} onPress={() => void refresh()}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={36} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>
            {isSupabaseConfigured()
              ? "No sessions yet. Book a wellness session to see it here."
              : "Connect Supabase to load session history."}
          </ThemedText>
        </View>
      ) : (
        sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onPress={() => navigation.navigate("SessionDetail", { sessionId: session.id })}
          />
        ))
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: LayoutSpacing.sm,
    paddingTop: LayoutSpacing.xs,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: LayoutSpacing.sm,
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
    borderRadius: BorderRadius.xs,
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
    alignItems: "center",
    paddingVertical: LayoutSpacing.xl,
    gap: LayoutSpacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: LayoutSpacing.sm,
    paddingHorizontal: LayoutSpacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.accent,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  skeletonLine: {
    height: 14,
    width: 140,
    borderRadius: 6,
    backgroundColor: Colors.light.backgroundSecondary,
  },
});
