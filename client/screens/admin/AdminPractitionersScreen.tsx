import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { Practitioner } from "@/data/practitioners";
import { formatInr } from "@/lib/formatCurrency";

type ApprovalStatus = "Approved" | "Pending" | "Rejected";

interface PractitionerState {
  approvalStatus: ApprovalStatus;
  isVerified: boolean;
}

function PractitionerCard({
  practitioner,
  state,
  onDelete,
  onApprove,
  onReject,
  onToggleVerification,
}: {
  practitioner: Practitioner;
  state: PractitionerState;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
  onToggleVerification: () => void;
}) {
  const getApprovalBadgeColor = (status: ApprovalStatus) => {
    switch (status) {
      case "Approved":
        return "#2E7D32";
      case "Pending":
        return "#F57F17";
      case "Rejected":
        return "#8B3A3A";
      default:
        return Colors.light.text;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Feather name="user" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameWithBadge}>
            <ThemedText style={styles.practitionerName}>{practitioner.name}</ThemedText>
            <View
              style={[
                styles.approvalBadge,
                { backgroundColor: getApprovalBadgeColor(state.approvalStatus) },
              ]}
            >
              <ThemedText style={styles.badgeText}>{state.approvalStatus}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.practitionerCategory}>{practitioner.category}</ThemedText>
          <ThemedText style={styles.practitionerExperience}>{practitioner.experience}</ThemedText>
          <ThemedText style={styles.practitionerPrice}>{formatInr(practitioner.pricePerSession)}/-</ThemedText>
          
          <View style={styles.credentialSection}>
            <View style={styles.credentialHeader}>
              <Feather name="check-circle" size={14} color={state.isVerified ? "#2E7D32" : Colors.light.textSecondary} />
              <ThemedText style={styles.credentialLabel}>Credential Verification</ThemedText>
              <ThemedText style={[styles.verificationStatus, { color: state.isVerified ? "#2E7D32" : Colors.light.textSecondary }]}>
                {state.isVerified ? "Verified" : "Unverified"}
              </ThemedText>
            </View>
            <Pressable
              style={styles.verificationToggle}
              onPress={onToggleVerification}
              testID={`button-toggle-verification-${practitioner.id}`}
            >
              <View style={[styles.toggleSwitch, state.isVerified && styles.toggleSwitchActive]}>
                <View style={[styles.toggleCircle, state.isVerified && styles.toggleCircleActive]} />
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.cardRight}>
        <View style={styles.ratingRow}>
          <Feather name="star" size={14} color={Colors.light.divider} />
          <ThemedText style={styles.ratingText}>{practitioner.rating}</ThemedText>
        </View>

        {state.approvalStatus === "Pending" ? (
          <View style={styles.actionButtonsContainer}>
            <Pressable
              style={[styles.actionButton, styles.approveButton]}
              onPress={onApprove}
              testID={`button-approve-${practitioner.id}`}
            >
              <Feather name="check" size={14} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText}>Approve</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.rejectButton]}
              onPress={onReject}
              testID={`button-reject-${practitioner.id}`}
            >
              <Feather name="x" size={14} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText}>Reject</ThemedText>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          style={styles.deleteButton}
          onPress={onDelete}
          testID={`button-delete-practitioner-${practitioner.id}`}
        >
          <Feather name="trash-2" size={16} color="#8B3A3A" />
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminPractitionersScreen({
  onAddPractitioner,
  onBackToDashboard,
}: {
  onAddPractitioner: () => void;
  onBackToDashboard: () => void;
}) {
  const { practitionerCategories, deletePractitioner, updatePractitionerMeta } = useDataContext();
  const { logActivity } = usePlatformConfig();
  const allPractitioners = practitionerCategories.flatMap((c) => c.practitioners);

  const getPractitionerState = (practitioner: (typeof allPractitioners)[0]): PractitionerState => ({
    approvalStatus: practitioner.approvalStatus ?? "Approved",
    isVerified: practitioner.isVerified ?? false,
  });

  const updatePractitionerState = (
    id: string,
    updates: Partial<PractitionerState>
  ) => {
    updatePractitionerMeta(id, updates);
  };

  const stats = {
    total: allPractitioners.length,
    approved: allPractitioners.filter((p) => getPractitionerState(p).approvalStatus === "Approved").length,
    pending: allPractitioners.filter((p) => getPractitionerState(p).approvalStatus === "Pending").length,
    rejected: allPractitioners.filter((p) => getPractitionerState(p).approvalStatus === "Rejected").length,
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
        <ThemedText style={styles.sectionTitle}>Practitioners</ThemedText>
        <Pressable
          style={styles.addButton}
          onPress={onAddPractitioner}
          testID="button-add-practitioner"
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <ThemedText style={styles.addButtonText}>Add Practitioner</ThemedText>
        </Pressable>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{stats.total}</ThemedText>
          <ThemedText style={styles.statLabel}>Total</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: "#2E7D32" }]}>{stats.approved}</ThemedText>
          <ThemedText style={styles.statLabel}>Approved</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: "#F57F17" }]}>{stats.pending}</ThemedText>
          <ThemedText style={styles.statLabel}>Pending</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: "#8B3A3A" }]}>{stats.rejected}</ThemedText>
          <ThemedText style={styles.statLabel}>Rejected</ThemedText>
        </View>
      </View>

      {allPractitioners.length === 0 ? (
        <View style={styles.emptyCard}>
          <ThemedText style={styles.emptyText}>
            No practitioners yet. Add a practitioner to get started.
          </ThemedText>
        </View>
      ) : (
        allPractitioners.map((practitioner) => (
        <PractitionerCard
          key={practitioner.id}
          practitioner={practitioner}
          state={getPractitionerState(practitioner)}
          onDelete={() => deletePractitioner(practitioner.id)}
          onApprove={() => {
            updatePractitionerState(practitioner.id, { approvalStatus: "Approved" });
            logActivity(`Practitioner ${practitioner.name} approved`, "user");
          }}
          onReject={() => {
            updatePractitionerState(practitioner.id, { approvalStatus: "Rejected" });
            logActivity(`Practitioner ${practitioner.name} rejected`, "user");
          }}
          onToggleVerification={() => {
            const current = getPractitionerState(practitioner);
            updatePractitionerState(practitioner.id, { isVerified: !current.isVerified });
          }}
        />
      ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
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
    flex: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  addButtonText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
  },
  nameWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  practitionerName: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  approvalBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  practitionerCategory: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  practitionerExperience: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  practitionerPrice: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  credentialSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.cardBackgroundAlt,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },
  credentialHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  credentialLabel: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  verificationStatus: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    marginLeft: Spacing.xs,
  },
  verificationToggle: {
    padding: Spacing.xs,
  },
  toggleSwitch: {
    width: 28,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.light.divider,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: "#2E7D32",
  },
  toggleCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  toggleCircleActive: {
    alignSelf: "flex-end",
  },
  cardRight: {
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
  },
  approveButton: {
    backgroundColor: "#2E7D32",
  },
  rejectButton: {
    backgroundColor: "#8B3A3A",
  },
  actionButtonText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  emptyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
