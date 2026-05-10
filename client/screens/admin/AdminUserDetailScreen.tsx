import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import {
  adminUsers,
  userSessionHistory,
  type AdminUser,
  type AdminSession,
} from "@/data/adminMockData";

function getUserStatusStyle(status: AdminUser["status"]) {
  switch (status) {
    case "Active":
      return { backgroundColor: "#013220" };
    case "Inactive":
      return { backgroundColor: Colors.light.brownLight };
    case "Suspended":
      return { backgroundColor: "#8B3A3A" };
    default:
      return { backgroundColor: Colors.light.brownLight };
  }
}

function getStatusTextColor(status: AdminUser["status"]) {
  switch (status) {
    case "Active":
      return "#FFFFFF";
    case "Inactive":
      return Colors.light.text;
    case "Suspended":
      return "#FFFFFF";
    default:
      return Colors.light.text;
  }
}

function getSessionStatusStyle(status: AdminSession["status"]) {
  switch (status) {
    case "Upcoming":
      return { backgroundColor: Colors.light.accent };
    case "Completed":
      return { backgroundColor: "#013220" };
    case "Cancelled":
      return { backgroundColor: Colors.light.brownDark };
    default:
      return { backgroundColor: Colors.light.accent };
  }
}

export default function AdminUserDetailScreen({
  userId,
  onBack,
}: {
  userId: string;
  onBack: () => void;
}) {
  const user = adminUsers.find((u) => u.id === userId);

  if (!user) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.sectionTitle}>User not found</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.backButton} testID="button-back">
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>User Details</ThemedText>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Feather name="user" size={28} color={Colors.light.accent} />
          </View>
          <View style={styles.profileNameRow}>
            <ThemedText style={styles.profileName}>{user.name}</ThemedText>
            <View style={[styles.statusBadge, getUserStatusStyle(user.status)]}>
              <ThemedText
                style={[
                  styles.statusBadgeText,
                  { color: getStatusTextColor(user.status) },
                ]}
              >
                {user.status}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.profileDetailRow}>
          <Feather name="mail" size={14} color={Colors.light.textSecondary} />
          <ThemedText style={styles.profileDetailText}>{user.email}</ThemedText>
        </View>
        <View style={styles.profileDetailRow}>
          <Feather name="phone" size={14} color={Colors.light.textSecondary} />
          <ThemedText style={styles.profileDetailText}>{user.phone}</ThemedText>
        </View>
        <View style={styles.profileDetailRow}>
          <Feather name="calendar" size={14} color={Colors.light.textSecondary} />
          <ThemedText style={styles.profileDetailText}>
            Joined {user.joinedDate}
          </ThemedText>
        </View>
        <View style={styles.profileDetailRow}>
          <Feather name="activity" size={14} color={Colors.light.textSecondary} />
          <ThemedText style={styles.profileDetailText}>
            {user.sessionsCount} sessions
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.subSectionTitle}>Session History</ThemedText>
      {userSessionHistory.map((session) => (
        <View key={session.id} style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <ThemedText style={styles.sessionPractitioner}>
              {session.practitionerName}
            </ThemedText>
            <View style={[styles.sessionStatusBadge, getSessionStatusStyle(session.status)]}>
              <ThemedText style={styles.sessionStatusText}>
                {session.status}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.sessionService}>{session.service}</ThemedText>
          <ThemedText style={styles.sessionDate}>
            {session.date} at {session.time}
          </ThemedText>
        </View>
      ))}
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
  headerRow: {
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
  profileCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(1, 50, 32, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  profileNameRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.sm,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  profileDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  profileDetailText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  sessionCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  sessionPractitioner: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    flex: 1,
  },
  sessionStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  sessionService: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: Spacing.xs,
  },
});
