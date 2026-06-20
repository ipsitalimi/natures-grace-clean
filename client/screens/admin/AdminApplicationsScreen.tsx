import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { RoleApplication } from "@/data/roleApplications";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useDataContext } from "@/context/DataContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import {
  applicationDisplayName,
  applicationDisplaySubtitle,
  approveRoleApplication,
  fetchAllRoleApplications,
  rejectRoleApplication,
} from "@/services/platform/roleApplicationsService";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ApplicationCard({
  application,
  onPress,
}: {
  application: RoleApplication;
  onPress: () => void;
}) {
  const name = applicationDisplayName(application.formData);
  const subtitle = applicationDisplaySubtitle(application);
  const statusColor =
    application.status === "Pending"
      ? "#F57F17"
      : application.status === "Approved"
        ? "#2E7D32"
        : "#8B3A3A";

  return (
    <Pressable style={styles.card} onPress={onPress} testID={`application-card-${application.id}`}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <ThemedText style={styles.cardName}>{name}</ThemedText>
          <ThemedText style={styles.cardSubtitle}>{subtitle}</ThemedText>
          <ThemedText style={styles.cardMeta}>
            {application.targetRole} · {formatDate(application.createdAt)}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <ThemedText style={styles.statusBadgeText}>{application.status}</ThemedText>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.light.textSecondary} style={styles.cardChevron} />
    </Pressable>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <View style={styles.detailField}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

export default function AdminApplicationsScreen({
  onBackToDashboard,
}: {
  onBackToDashboard: () => void;
}) {
  const { logActivity, refreshRemoteConfig } = usePlatformConfig();
  const { refreshContent } = useDataContext();
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RoleApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadApplications = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setApplications([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllRoleApplications();
      setApplications(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load applications");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadApplications();
    }, [loadApplications])
  );

  const pendingPractitioner = applications.filter(
    (a) => a.targetRole === "Practitioner" && a.status === "Pending"
  );
  const pendingSeller = applications.filter(
    (a) => a.targetRole === "Seller" && a.status === "Pending"
  );
  const sellerApplications = applications.filter((a) => a.targetRole === "Seller");
  const practitionerApplications = applications.filter((a) => a.targetRole === "Practitioner");
  const selected = selectedId ? applications.find((a) => a.id === selectedId) : null;

  const handleApprove = async (application: RoleApplication) => {
    setActionBusy(true);
    setActionError(null);
    const result = await approveRoleApplication(application.id);
    setActionBusy(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    logActivity(
      `${application.targetRole} application approved for ${applicationDisplayName(application.formData)}`,
      "user"
    );
    await refreshRemoteConfig({ includeProfiles: true });
    await refreshContent();
    await loadApplications();
    setSelectedId(null);
  };

  const handleReject = async (application: RoleApplication, reason: string) => {
    setActionBusy(true);
    setActionError(null);
    const result = await rejectRoleApplication(application.id, reason);
    setActionBusy(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    logActivity(
      `${application.targetRole} application rejected for ${applicationDisplayName(application.formData)}`,
      "user"
    );
    await loadApplications();
    setSelectedId(null);
    setRejectTarget(null);
    setRejectReason("");
  };

  if (selected) {
    const form = selected.formData;
    return (
      <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => setSelectedId(null)} testID="button-back-applications">
            <Feather name="arrow-left" size={16} color={Colors.light.accent} />
          </Pressable>
          <ThemedText style={styles.sectionTitle}>Application</ThemedText>
        </View>

        <View style={styles.detailCard}>
          <ThemedText style={styles.detailTitle}>{applicationDisplayName(form)}</ThemedText>
          <ThemedText style={styles.detailRole}>
            {selected.targetRole} · {selected.status}
          </ThemedText>
          <ThemedText style={styles.detailMeta}>Submitted {formatDate(selected.createdAt)}</ThemedText>
        </View>

        <View style={styles.detailCard}>
          <DetailField label="Email" value={form.email ?? ""} />
          <DetailField label="Phone" value={form.phone ?? ""} />
          {selected.targetRole === "Practitioner" ? (
            <>
              <DetailField label="Category" value={form.category ?? ""} />
              <DetailField label="Experience" value={form.experience ?? ""} />
              <DetailField label="Certifications" value={form.certifications ?? ""} />
              <DetailField label="Session types" value={form.sessionTypes ?? ""} />
              <DetailField label="Price range" value={form.priceRange ?? ""} />
              <DetailField label="Bio" value={form.bio ?? ""} />
              <DetailField label="Why join" value={form.whyJoin ?? ""} />
              <DetailField label="Availability" value={form.availability ?? ""} />
            </>
          ) : (
            <>
              <DetailField label="Brand / store" value={form.brandName ?? ""} />
              <DetailField label="Category" value={form.category ?? ""} />
              <DetailField label="Product types" value={form.productTypes ?? ""} />
              <DetailField label="About products" value={form.description ?? ""} />
              <DetailField label="Website" value={form.website ?? ""} />
              <DetailField label="Why sell" value={form.whyJoin ?? ""} />
            </>
          )}
        </View>

        {actionError ? (
          <ThemedText style={styles.errorText} testID="text-application-action-error">
            {actionError}
          </ThemedText>
        ) : null}

        {selected.status === "Pending" ? (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => void handleApprove(selected)}
              disabled={actionBusy}
              testID="button-approve-application"
            >
              {actionBusy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.actionButtonText}>Approve</ThemedText>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => setRejectTarget(selected)}
              disabled={actionBusy}
              testID="button-reject-application"
            >
              <Feather name="x" size={16} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText}>Reject</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={rejectTarget != null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>Rejection reason</ThemedText>
            <ThemedText style={styles.modalHint}>
              This reason will be shown to the applicant so they can update and reapply.
            </ThemedText>
            <TextInput
              style={styles.modalInput}
              placeholder="Explain what needs to be corrected…"
              placeholderTextColor={Colors.light.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => { setRejectTarget(null); setRejectReason(""); }}>
                <ThemedText style={styles.modalCancel}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (rejectTarget) void handleReject(rejectTarget, rejectReason);
                }}
                disabled={actionBusy || !rejectReason.trim()}
              >
                <ThemedText style={[styles.modalConfirm, !rejectReason.trim() && { opacity: 0.5 }]}>
                  Reject application
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </>
    );
  }

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard} testID="button-back-dashboard">
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Applications</ThemedText>
      </View>

      {!isSupabaseConfigured() ? (
        <ThemedText style={styles.emptyText}>Connect Supabase to review applications.</ThemedText>
      ) : null}

      {loading ? (
        <ActivityIndicator color={Colors.light.accent} style={{ marginTop: 24 }} />
      ) : null}

      {error ? (
        <Pressable onPress={() => void loadApplications()} testID="button-retry-applications">
          <ThemedText style={styles.errorText}>{error} — tap to retry</ThemedText>
        </Pressable>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: "#F57F17" }]}>{pendingPractitioner.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Pending practitioners</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={[styles.statValue, { color: "#F57F17" }]}>{pendingSeller.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Pending sellers</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.hintText}>
        Review new seller and practitioner requests here. The Sellers screen only lists accounts already
        approved as sellers.
      </ThemedText>

      <ThemedText style={styles.groupTitle}>Practitioner applications</ThemedText>
      {practitionerApplications.length === 0 ? (
        <ThemedText style={styles.emptyGroup}>No practitioner applications yet.</ThemedText>
      ) : (
        practitionerApplications.map((app) => (
          <ApplicationCard key={app.id} application={app} onPress={() => setSelectedId(app.id)} />
        ))
      )}

      <ThemedText style={styles.groupTitle}>Seller applications</ThemedText>
      {sellerApplications.length === 0 ? (
        <ThemedText style={styles.emptyGroup}>
          No seller applications yet. New submissions appear here (not under Sellers — that list is for
          approved seller accounts only).
        </ThemedText>
      ) : (
        sellerApplications.map((app) => (
          <ApplicationCard key={app.id} application={app} onPress={() => setSelectedId(app.id)} />
        ))
      )}
    </ScrollView>

      <Modal visible={rejectTarget != null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>Rejection reason</ThemedText>
            <ThemedText style={styles.modalHint}>
              This reason will be shown to the applicant so they can update and reapply.
            </ThemedText>
            <TextInput
              style={styles.modalInput}
              placeholder="Explain what needs to be corrected…"
              placeholderTextColor={Colors.light.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => { setRejectTarget(null); setRejectReason(""); }}>
                <ThemedText style={styles.modalCancel}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (rejectTarget) void handleReject(rejectTarget, rejectReason);
                }}
                disabled={actionBusy || !rejectReason.trim()}
              >
                <ThemedText style={[styles.modalConfirm, !rejectReason.trim() && { opacity: 0.5 }]}>
                  Reject application
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: Spacing.lg, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.lg },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: Spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: 12,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  statLabel: { fontSize: 11, color: Colors.light.textSecondary, textAlign: "center", marginTop: 4 },
  groupTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  emptyGroup: { color: Colors.light.textSecondary, marginBottom: Spacing.lg, fontSize: 14 },
  hintText: {
    color: Colors.light.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.lg,
  },
  emptyText: { color: Colors.light.textSecondary, textAlign: "center", marginTop: 24 },
  errorText: { color: "#8B3A3A", marginBottom: Spacing.md, fontSize: 13 },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTop: { flex: 1, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardLeft: { flex: 1, paddingRight: Spacing.sm },
  cardName: { fontSize: 16, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  cardSubtitle: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  cardMeta: { fontSize: 12, color: Colors.light.textMuted, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "600" },
  cardChevron: { marginLeft: 8 },
  detailCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  detailTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  detailRole: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 4 },
  detailMeta: { fontSize: 12, color: Colors.light.textMuted, marginTop: 2, marginBottom: Spacing.sm },
  detailField: { marginTop: Spacing.md },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  detailValue: { fontSize: 15, color: Colors.light.text, lineHeight: 22 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: Spacing.sm },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
  },
  approveButton: { backgroundColor: "#2E7D32" },
  rejectButton: { backgroundColor: "#8B3A3A" },
  actionButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  modalHint: { fontSize: 13, color: Colors.light.textMuted, marginBottom: Spacing.md, lineHeight: 18 },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.light.divider,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minHeight: 100,
    textAlignVertical: "top",
    color: Colors.light.text,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    marginTop: Spacing.lg,
  },
  modalCancel: { color: Colors.light.textMuted, fontSize: 15 },
  modalConfirm: { color: "#8B3A3A", fontWeight: "700", fontSize: 15 },
});
