import React from "react";
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import {
  DashboardWelcomeCard,
  DashboardSectionTitle,
  DashboardStatCard,
  DashboardQuickActionGrid,
  DashboardEmptyState,
  DashboardPanel,
  getTimeGreeting,
} from "@/components/dashboard";
import { Colors, BorderRadius } from "@/constants/theme";
import { Layout, LayoutSpacing } from "@/constants/layout";
import type { AdminScreenName } from "./AdminLayout";
import type { AdminSessionStatus } from "@/data/adminSessions";
import type { ActivityLogActionType } from "@/data/activityLog";
import { useAdminSessions } from "@/context/AdminSessionsContext";
import { useDataContext } from "@/context/DataContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

const activityIcons: Record<ActivityLogActionType, keyof typeof Feather.glyphMap> = {
  booking: "calendar",
  user: "user-plus",
  review: "star",
  event: "map-pin",
  store: "package",
  settings: "settings",
};

const activityColors: Record<ActivityLogActionType, string> = {
  booking: "#013220",
  user: "#2E86C1",
  review: "#E67E22",
  event: "#8E44AD",
  store: "#16A085",
  settings: "#6B7280",
};

function getStatusBadgeStyle(status: AdminSessionStatus) {
  switch (status) {
    case "Upcoming":
      return { backgroundColor: "rgba(1, 50, 32, 0.12)", text: "#013220" };
    case "Completed":
      return { backgroundColor: "rgba(46, 134, 193, 0.12)", text: "#2E86C1" };
    case "Cancelled":
      return { backgroundColor: "rgba(139, 58, 58, 0.1)", text: Colors.light.brownDark };
    default:
      return { backgroundColor: "rgba(1, 50, 32, 0.12)", text: "#013220" };
  }
}

interface AdminDashboardProps {
  onNavigate?: (screen: AdminScreenName) => void;
  onAddPractitioner?: () => void;
}

export default function AdminDashboardScreen({ onNavigate, onAddPractitioner }: AdminDashboardProps) {
  const { events, practitionerCategories, storeCategories, resources, dataLoading } = useDataContext();
  const {
    activityLog,
    activityLogLoading,
    activityLogError,
    refreshActivityLog,
  } = usePlatformConfig();
  const {
    upcomingSessions,
    sessionsLoading,
    sessionsError,
    refreshUpcomingSessions,
  } = useAdminSessions();
  const practitionerCount = practitionerCategories.flatMap((c) => c.practitioners).length;
  const productCount = storeCategories.flatMap((c) => c.products).length;
  const activeEventCount = events.filter((e) => e.status === "Active").length;
  const publishedResourceCount = resources.filter((r) => r.published !== false).length;

  const statCards: {
    label: string;
    value: number;
    icon: keyof typeof Feather.glyphMap;
    status: string;
    screen: AdminScreenName;
  }[] = [
    {
      label: "Events",
      value: events.length,
      icon: "calendar",
      status: activeEventCount === 1 ? "1 active" : `${activeEventCount} active`,
      screen: "Community",
    },
    {
      label: "Practitioners",
      value: practitionerCount,
      icon: "heart",
      status: practitionerCount === 0 ? "None yet" : practitionerCount === 1 ? "1 listed" : `${practitionerCount} listed`,
      screen: "Practitioners",
    },
    {
      label: "Products",
      value: productCount,
      icon: "shopping-bag",
      status: productCount === 0 ? "None yet" : `${storeCategories.length} ${storeCategories.length === 1 ? "category" : "categories"}`,
      screen: "Store",
    },
    {
      label: "Resources",
      value: resources.length,
      icon: "book",
      status: publishedResourceCount === 0 ? "None published" : `${publishedResourceCount} published`,
      screen: "Resources",
    },
  ];

  const recentActivity = activityLog.slice(0, 6);
  const greeting = getTimeGreeting();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <DashboardWelcomeCard
        greeting={`${greeting}, Admin`}
        subtitle="Manage practitioners, products, resources and platform activity."
        testID="admin-welcome-card"
      />

      <DashboardSectionTitle style="eyebrow">Quick actions</DashboardSectionTitle>
      <DashboardQuickActionGrid
        columns={3}
        actions={[
          {
            id: "add-practitioner",
            icon: "user-plus",
            label: "Add Practitioner",
            onPress: () => onAddPractitioner?.(),
            testID: "quick-action-add-practitioner",
          },
          {
            id: "add-product",
            icon: "plus-circle",
            label: "Add Product",
            onPress: () => onNavigate?.("Store"),
            testID: "quick-action-add-product",
          },
          {
            id: "create-event",
            icon: "calendar",
            label: "Create Event",
            onPress: () => onNavigate?.("Community"),
            testID: "quick-action-create-event",
          },
          {
            id: "upload-resource",
            icon: "upload",
            label: "Upload Resource",
            onPress: () => onNavigate?.("Resources"),
            testID: "quick-action-upload-resource",
          },
          {
            id: "view-applications",
            icon: "inbox",
            label: "View Applications",
            onPress: () => onNavigate?.("Applications"),
            testID: "quick-action-view-applications",
          },
          {
            id: "platform-settings",
            icon: "settings",
            label: "Platform Settings",
            onPress: () => onNavigate?.("Settings"),
            testID: "quick-action-platform-settings",
          },
        ]}
      />

      <DashboardSectionTitle>Today's overview</DashboardSectionTitle>
      {dataLoading && isSupabaseConfigured() ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.light.accent} size="small" />
          <ThemedText style={styles.loadingText}>Loading catalog counts…</ThemedText>
        </View>
      ) : null}
      <View style={styles.statsGrid}>
        {statCards.map((card) => (
          <DashboardStatCard
            key={card.label}
            icon={card.icon}
            value={card.value}
            label={card.label}
            status={card.status}
            onPress={() => onNavigate?.(card.screen)}
          />
        ))}
      </View>

      <DashboardSectionTitle>Upcoming sessions</DashboardSectionTitle>
      <DashboardPanel>
        {sessionsLoading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={Colors.light.accent} size="small" />
            <ThemedText style={styles.stateText}>Loading sessions…</ThemedText>
          </View>
        ) : sessionsError ? (
          <View style={styles.stateWrap}>
            <ThemedText style={styles.errorText}>{sessionsError}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={() => refreshUpcomingSessions()}>
              <ThemedText style={styles.retryBtnText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : !isSupabaseConfigured() ? (
          <DashboardEmptyState
            icon="calendar"
            message="Connect Supabase to load practitioner bookings."
          />
        ) : upcomingSessions.length === 0 ? (
          <DashboardEmptyState
            icon="calendar"
            message="No upcoming sessions. Confirmed bookings will appear here."
          />
        ) : (
          upcomingSessions.slice(0, 5).map((session, index) => {
            const badge = getStatusBadgeStyle(session.status);
            return (
              <View
                key={session.id}
                style={[styles.sessionRow, index < Math.min(upcomingSessions.length, 5) - 1 && styles.rowBorder]}
              >
                <View style={styles.sessionAvatar}>
                  <ThemedText style={styles.sessionAvatarText}>
                    {session.userName.charAt(0)}
                  </ThemedText>
                </View>
                <View style={styles.sessionBody}>
                  <View style={styles.sessionTop}>
                    <ThemedText style={styles.sessionName} numberOfLines={1}>
                      {session.userName}
                    </ThemedText>
                    <View style={[styles.statusPill, { backgroundColor: badge.backgroundColor }]}>
                      <ThemedText style={[styles.statusPillText, { color: badge.text }]}>
                        {session.status}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.sessionMeta} numberOfLines={1}>
                    with {session.practitionerName} · {session.service}
                  </ThemedText>
                  <ThemedText style={styles.sessionTime}>
                    {session.date} at {session.time} ({session.duration})
                  </ThemedText>
                </View>
              </View>
            );
          })
        )}
      </DashboardPanel>

      <DashboardSectionTitle>Recent activity</DashboardSectionTitle>
      <DashboardPanel>
        {activityLogLoading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={Colors.light.accent} size="small" />
            <ThemedText style={styles.stateText}>Loading activity…</ThemedText>
          </View>
        ) : activityLogError ? (
          <View style={styles.stateWrap}>
            <ThemedText style={styles.errorText}>{activityLogError}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={() => refreshActivityLog()}>
              <ThemedText style={styles.retryBtnText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : !isSupabaseConfigured() ? (
          <DashboardEmptyState
            icon="activity"
            message="Connect Supabase to persist admin activity."
          />
        ) : recentActivity.length === 0 ? (
          <DashboardEmptyState
            icon="activity"
            message="No admin actions logged yet. Changes you make will appear here."
          />
        ) : (
          recentActivity.map((activity, index) => (
            <View
              key={activity.id}
              style={[styles.activityRow, index < recentActivity.length - 1 && styles.rowBorder]}
            >
              <View
                style={[
                  styles.activityIcon,
                  { backgroundColor: activityColors[activity.type] + "18" },
                ]}
              >
                <Feather
                  name={activityIcons[activity.type]}
                  size={14}
                  color={activityColors[activity.type]}
                />
              </View>
              <ThemedText style={styles.activityText} numberOfLines={2}>
                {activity.description}
              </ThemedText>
              <ThemedText style={styles.activityTime}>{activity.timeAgo}</ThemedText>
            </View>
          ))
        )}
      </DashboardPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  contentContainer: {
    paddingHorizontal: Layout.gutter,
    paddingTop: LayoutSpacing.sm,
    paddingBottom: LayoutSpacing.xl,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: LayoutSpacing.sm,
    marginBottom: LayoutSpacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: LayoutSpacing.sm,
    marginBottom: LayoutSpacing.xs,
  },
  stateWrap: {
    alignItems: "center",
    paddingVertical: LayoutSpacing.lg,
    gap: LayoutSpacing.sm,
  },
  stateText: {
    fontSize: 13,
    color: Colors.light.textMuted,
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    color: "#8B3A3A",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: LayoutSpacing.lg,
    paddingVertical: LayoutSpacing.sm,
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.xs,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: LayoutSpacing.md,
    paddingVertical: LayoutSpacing.sm,
    gap: LayoutSpacing.sm,
  },
  sessionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(1, 50, 32, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  sessionBody: {
    flex: 1,
    gap: 2,
  },
  sessionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: LayoutSpacing.xs,
  },
  sessionName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  sessionMeta: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  sessionTime: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: LayoutSpacing.md,
    paddingVertical: LayoutSpacing.sm,
    gap: LayoutSpacing.sm,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
});
