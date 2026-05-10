import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { adminUsers as initialAdminUsers, type AdminUser } from "@/data/adminMockData";

const ROLE_CYCLE = ["User", "Practitioner", "Seller", "Admin"] as const;

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

function getRoleColor(role: AdminUser["role"]) {
  switch (role) {
    case "Admin":
      return "#8B3A3A";
    case "Practitioner":
      return "#013220";
    case "Seller":
      return "#C4A97A";
    case "User":
    default:
      return "#AAB494";
  }
}

export default function AdminUsersScreen({
  onViewUser,
  onBackToDashboard,
}: {
  onViewUser: (userId: string) => void;
  onBackToDashboard: () => void;
}) {
  const [users, setUsers] = useState<AdminUser[]>(initialAdminUsers);

  const toggleUserStatus = (userId: string) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        const newStatus = user.status === "Active" ? "Suspended" : "Active";
        return { ...user, status: newStatus };
      }
      return user;
    }));
  };

  const cycleUserRole = (userId: string) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        const currentIndex = ROLE_CYCLE.indexOf(user.role);
        const nextIndex = (currentIndex + 1) % ROLE_CYCLE.length;
        return { ...user, role: ROLE_CYCLE[nextIndex] };
      }
      return user;
    }));
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === "Active").length,
    suspended: users.filter(u => u.status === "Suspended").length,
    inactive: users.filter(u => u.status === "Inactive").length,
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard} testID="button-back-dashboard">
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Users</ThemedText>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue} testID="stat-total-users">{stats.total}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Users</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: "#013220" }]} testID="stat-active-count">{stats.active}</ThemedText>
          <ThemedText style={styles.statLabel}>Active</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: "#8B3A3A" }]} testID="stat-suspended-count">{stats.suspended}</ThemedText>
          <ThemedText style={styles.statLabel}>Suspended</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: Colors.light.brownLight }]} testID="stat-inactive-count">{stats.inactive}</ThemedText>
          <ThemedText style={styles.statLabel}>Inactive</ThemedText>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={18} color={Colors.light.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={Colors.light.textSecondary}
          editable={true}
        />
      </View>

      {users.map((user) => (
        <View key={user.id} style={styles.userCard}>
          <View style={styles.userInfo}>
            <ThemedText style={styles.userName}>{user.name}</ThemedText>
            <ThemedText style={styles.userEmail}>{user.email}</ThemedText>
          </View>
          <View style={styles.userActionsContainer}>
            <View style={styles.statusAndRoleRow}>
              <View
                style={[styles.statusBadge, getUserStatusStyle(user.status)]}
              >
                <ThemedText
                  style={[
                    styles.statusBadgeText,
                    { color: getStatusTextColor(user.status) },
                  ]}
                >
                  {user.status}
                </ThemedText>
              </View>
              <Pressable
                style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}
                onPress={() => cycleUserRole(user.id)}
                testID={`button-cycle-role-${user.id}`}
              >
                <ThemedText style={styles.roleBadgeText}>{user.role}</ThemedText>
              </Pressable>
            </View>
            <View style={styles.actionButtonsRow}>
              <Pressable
                style={styles.suspendButton}
                onPress={() => toggleUserStatus(user.id)}
                testID={`button-toggle-status-${user.id}`}
              >
                <Feather name={user.status === "Active" ? "pause-circle" : "play-circle"} size={14} color={Colors.light.accent} />
                <ThemedText style={styles.suspendButtonText}>
                  {user.status === "Active" ? "Suspend" : "Activate"}
                </ThemedText>
              </Pressable>
              <Pressable
                style={styles.viewButton}
                onPress={() => onViewUser(user.id)}
                testID={`button-view-user-${user.id}`}
              >
                <Feather name="eye" size={14} color={Colors.light.accent} />
                <ThemedText style={styles.viewButtonText}>View</ThemedText>
              </Pressable>
            </View>
          </View>
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
  statsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  userCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  userInfo: {
    marginBottom: Spacing.md,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  userActionsContainer: {
    gap: Spacing.sm,
  },
  statusAndRoleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  suspendButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  suspendButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  viewButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
});
