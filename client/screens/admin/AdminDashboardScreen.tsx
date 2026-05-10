import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { AdminScreenName } from "./AdminLayout";
import {
  adminSessions,
  adminActivities,
  type AdminSession,
  type AdminActivity,
} from "@/data/adminMockData";
import { useDataContext } from "@/context/DataContext";

interface StatCardData {
  label: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
  trend: string;
  trendColor: string;
}


const activityIcons: Record<AdminActivity["type"], keyof typeof Feather.glyphMap> = {
  booking: "calendar",
  user: "user-plus",
  review: "star",
  event: "map-pin",
  store: "package",
};

const activityColors: Record<AdminActivity["type"], string> = {
  booking: "#013220",
  user: "#2E86C1",
  review: "#E67E22",
  event: "#8E44AD",
  store: "#16A085",
};

function getStatusBadgeStyle(status: AdminSession["status"]) {
  switch (status) {
    case "Upcoming":
      return { backgroundColor: "#013220" };
    case "Completed":
      return { backgroundColor: "#2E86C1" };
    case "Cancelled":
      return { backgroundColor: Colors.light.brownDark };
    default:
      return { backgroundColor: "#013220" };
  }
}

function getServiceChipColor(service: string) {
  if (service.toLowerCase().includes("reiki") || service.toLowerCase().includes("healing")) return "#013220";
  if (service.toLowerCase().includes("counsel")) return "#2E86C1";
  if (service.toLowerCase().includes("meditation")) return "#8E44AD";
  if (service.toLowerCase().includes("yoga")) return "#16A085";
  return "#E67E22";
}

interface AdminDashboardProps {
  onNavigate?: (screen: AdminScreenName) => void;
  onAddPractitioner?: () => void;
}

export default function AdminDashboardScreen({ onNavigate, onAddPractitioner }: AdminDashboardProps) {
  const { events, practitionerCategories, storeCategories, resources } = useDataContext();
  const practitionerCount = practitionerCategories.flatMap((c) => c.practitioners).length;
  const productCount = storeCategories.flatMap((c) => c.products).length;

  const statCards: (StatCardData & { screen: AdminScreenName })[] = [
    { label: "Events", value: events.length, icon: "calendar", trend: `${events.filter((e) => e.status === "Active").length} active`, trendColor: "#013220", screen: "Community" },
    { label: "Practitioners", value: practitionerCount, icon: "heart", trend: `${practitionerCategories.length} categories`, trendColor: "#013220", screen: "Practitioners" },
    { label: "Products", value: productCount, icon: "shopping-bag", trend: `${storeCategories.length} categories`, trendColor: "#013220", screen: "Store" },
    { label: "Resources", value: resources.length, icon: "book", trend: "Articles, Audio, Practices", trendColor: "#013220", screen: "Resources" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.welcomeSection}>
        <ThemedText style={styles.welcomeTitle}>Welcome back, Admin</ThemedText>
      </View>

      <View style={styles.quickActionsRow}>
        <Pressable
          style={styles.quickActionBtn}
          onPress={() => onAddPractitioner?.()}
          testID="quick-action-add-practitioner"
        >
          <Feather name="user-plus" size={16} color="#FFFFFF" />
          <ThemedText style={styles.quickActionText}>Add Practitioner</ThemedText>
        </Pressable>
        <Pressable
          style={styles.quickActionBtn}
          onPress={() => onNavigate?.("Store")}
          testID="quick-action-add-product"
        >
          <Feather name="plus-circle" size={16} color="#FFFFFF" />
          <ThemedText style={styles.quickActionText}>Add Product</ThemedText>
        </Pressable>
        <Pressable
          style={styles.quickActionBtn}
          onPress={() => onNavigate?.("Community")}
          testID="quick-action-create-event"
        >
          <Feather name="calendar" size={16} color="#FFFFFF" />
          <ThemedText style={styles.quickActionText}>Create Event</ThemedText>
        </Pressable>
      </View>

      <ThemedText style={styles.sectionTitle}>Today's Overview</ThemedText>
      <View style={styles.statsGrid}>
        {statCards.map((card) => (
          <Pressable key={card.label} style={styles.statCard} onPress={() => onNavigate?.(card.screen)}>
            <View style={styles.statCardTop}>
              <View style={styles.statIconCircle}>
                <Feather name={card.icon} size={20} color="#013220" />
              </View>
            </View>
            <ThemedText style={styles.statValue}>{card.value.toLocaleString()}</ThemedText>
            <ThemedText style={styles.statLabel}>{card.label}</ThemedText>
            <ThemedText style={styles.statTrend}>{card.trend}</ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText style={styles.sectionTitle}>Upcoming Sessions</ThemedText>
      {adminSessions.slice(0, 5).map((session) => (
        <View key={session.id} style={styles.sessionCard}>
          <View style={styles.sessionRow}>
            <View style={styles.sessionAvatarCircle}>
              <ThemedText style={styles.sessionAvatarText}>
                {session.userName.charAt(0)}
              </ThemedText>
            </View>
            <View style={styles.sessionInfo}>
              <View style={styles.sessionNameRow}>
                <ThemedText style={styles.sessionUser}>{session.userName}</ThemedText>
                <View style={[styles.statusBadge, getStatusBadgeStyle(session.status)]}>
                  <ThemedText style={styles.statusBadgeText}>{session.status}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.sessionPractitioner}>
                with {session.practitionerName}
              </ThemedText>
              <View style={styles.sessionMeta}>
                <View style={[styles.serviceChip, { backgroundColor: getServiceChipColor(session.service) + "18" }]}>
                  <ThemedText style={[styles.serviceChipText, { color: getServiceChipColor(session.service) }]}>
                    {session.service}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.sessionDateRow}>
                <Feather name="clock" size={12} color={Colors.light.textMuted} />
                <ThemedText style={styles.sessionDateTime}>
                  {session.date} at {session.time} ({session.duration})
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      ))}

      <ThemedText style={styles.sectionTitle}>Recent Activity</ThemedText>
      <View style={styles.activityCard}>
        {adminActivities.slice(0, 6).map((activity, index) => (
          <View
            key={activity.id}
            style={[
              styles.activityRow,
              index < Math.min(adminActivities.length, 6) - 1 ? styles.activityRowBorder : null,
            ]}
          >
            <View style={[styles.activityIconCircle, { backgroundColor: activityColors[activity.type] + "18" }]}>
              <Feather
                name={activityIcons[activity.type]}
                size={14}
                color={activityColors[activity.type]}
              />
            </View>
            <ThemedText style={styles.activityDescription} numberOfLines={2}>
              {activity.description}
            </ThemedText>
            <ThemedText style={styles.activityTime}>{activity.timeAgo}</ThemedText>
          </View>
        ))}
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
    paddingBottom: 40,
  },
  welcomeSection: {
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#013220",
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: Spacing.lg,
  },
  statCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 16,
    width: "47%",
    flexGrow: 1,
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.06)",
  },
  statCardTop: {
    marginBottom: 10,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(1, 50, 32, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    lineHeight: 38,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  statTrend: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#013220",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#013220",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#013220",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    minHeight: 44,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
  },
  sessionCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.06)",
  },
  sessionRow: {
    flexDirection: "row",
    gap: 14,
  },
  sessionAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(1, 50, 32, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  sessionAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#013220",
    fontFamily: "Nunito_700Bold",
  },
  sessionInfo: {
    flex: 1,
  },
  sessionNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  sessionUser: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    flex: 1,
  },
  sessionPractitioner: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  sessionMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  serviceChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  serviceChipText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
  },
  sessionDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sessionDateTime: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  activityCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: 4,
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.06)",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  activityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityDescription: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  activityTime: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginLeft: 8,
  },
});
