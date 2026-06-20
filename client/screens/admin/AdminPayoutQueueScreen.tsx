import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAdminPayoutQueue,
  updatePayoutStatus,
  type PayoutQueueItem,
} from "@/services/platform/adminOperationsService";

const STATUSES = ["Under Review", "Processing", "Completed", "Rejected"] as const;

function PayoutCard({
  item,
  type,
  onAction,
  busy,
}: {
  item: PayoutQueueItem;
  type: "seller" | "practitioner";
  onAction: (status: string) => void;
  busy: boolean;
}) {
  const name =
    type === "seller"
      ? item.seller_wallets?.sellers?.store_name ?? "Seller"
      : item.practitioner_wallets?.practitioners?.name ?? "Practitioner";

  return (
    <View style={styles.card}>
      <ThemedText style={styles.cardTitle}>{name}</ThemedText>
      <ThemedText style={styles.cardMeta}>
        ₹{Number(item.amount).toLocaleString("en-IN")} · {item.status}
      </ThemedText>
      <ThemedText style={styles.cardDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </ThemedText>
      {item.status === "Pending" || item.status === "Under Review" || item.status === "Processing" ? (
        <View style={styles.actionRow}>
          {STATUSES.map((s) => (
            <Pressable
              key={s}
              style={[styles.actionBtn, busy && styles.actionDisabled]}
              onPress={() => onAction(s)}
              disabled={busy}
            >
              <ThemedText style={styles.actionBtnText}>{s}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function AdminPayoutQueueScreen({
  onBackToDashboard,
}: {
  onBackToDashboard: () => void;
}) {
  const { session } = useAuth();
  const [seller, setSeller] = useState<PayoutQueueItem[]>([]);
  const [practitioner, setPractitioner] = useState<PayoutQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    type: "seller" | "practitioner";
    id: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    const result = await fetchAdminPayoutQueue(session.access_token);
    setSeller(result.seller);
    setPractitioner(result.practitioner);
    if (result.error) setError(result.error);
    setLoading(false);
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleStatus = async (
    type: "seller" | "practitioner",
    id: string,
    status: string
  ) => {
    if (!session?.access_token) return;
    if (status === "Rejected") {
      setRejectModal({ type, id });
      return;
    }
    setBusyId(id);
    const result = await updatePayoutStatus(session.access_token, type, id, status);
    setBusyId(null);
    if (!result.ok) {
      Alert.alert("Error", result.error ?? "Could not update payout");
      return;
    }
    await load();
  };

  const confirmReject = async () => {
    if (!rejectModal || !session?.access_token) return;
    setBusyId(rejectModal.id);
    const result = await updatePayoutStatus(
      session.access_token,
      rejectModal.type,
      rejectModal.id,
      "Rejected",
      rejectReason.trim() || "Rejected by admin"
    );
    setBusyId(null);
    setRejectModal(null);
    setRejectReason("");
    if (!result.ok) {
      Alert.alert("Error", result.error ?? "Could not reject payout");
      return;
    }
    await load();
  };

  const pending = [...seller, ...practitioner].filter(
    (p) => p.status === "Pending" || p.status === "Under Review" || p.status === "Processing"
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard}>
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Withdrawal Queue</ThemedText>
      </View>

      <ThemedText style={styles.hint}>
        Process seller and practitioner withdrawals manually within 3–7 business days.
      </ThemedText>

      {loading ? (
        <ActivityIndicator color={Colors.light.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      ) : pending.length === 0 ? (
        <ThemedText style={styles.emptyText}>No pending withdrawal requests.</ThemedText>
      ) : (
        <>
          {seller
            .filter((p) => p.status !== "Completed" && p.status !== "Rejected")
            .map((item) => (
              <PayoutCard
                key={`s-${item.id}`}
                item={item}
                type="seller"
                busy={busyId === item.id}
                onAction={(s) => void handleStatus("seller", item.id, s)}
              />
            ))}
          {practitioner
            .filter((p) => p.status !== "Completed" && p.status !== "Rejected")
            .map((item) => (
              <PayoutCard
                key={`p-${item.id}`}
                item={item}
                type="practitioner"
                busy={busyId === item.id}
                onAction={(s) => void handleStatus("practitioner", item.id, s)}
              />
            ))}
        </>
      )}

      <Modal visible={rejectModal != null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>Reject withdrawal</ThemedText>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for rejection"
              placeholderTextColor={Colors.light.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setRejectModal(null)}>
                <ThemedText style={styles.modalCancel}>Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={() => void confirmReject()}>
                <ThemedText style={styles.modalConfirm}>Reject</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.md },
  backButton: { padding: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: Colors.light.text },
  hint: { fontSize: 13, color: Colors.light.textMuted, marginBottom: Spacing.lg, lineHeight: 18 },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: Colors.light.text },
  cardMeta: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 4 },
  cardDate: { fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: Spacing.md },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    minHeight: 36,
    justifyContent: "center",
  },
  actionDisabled: { opacity: 0.5 },
  actionBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  emptyText: { textAlign: "center", color: Colors.light.textMuted, marginTop: 40 },
  errorText: { color: "#8B3A3A", textAlign: "center", marginTop: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  modalTitle: { fontSize: 17, fontWeight: "600", marginBottom: Spacing.md },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.light.divider,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: "top",
    color: Colors.light.text,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    marginTop: Spacing.lg,
  },
  modalCancel: { color: Colors.light.textMuted },
  modalConfirm: { color: "#8B3A3A", fontWeight: "600" },
});
