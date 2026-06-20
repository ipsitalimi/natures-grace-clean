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
  fetchAdminRefunds,
  updateRefundStatus,
  type RefundQueueItem,
} from "@/services/platform/adminOperationsService";

export default function AdminRefundQueueScreen({
  onBackToDashboard,
}: {
  onBackToDashboard: () => void;
}) {
  const { session } = useAuth();
  const [refunds, setRefunds] = useState<RefundQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<{
    id: string;
    status: "in_review" | "approved" | "rejected";
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    const result = await fetchAdminRefunds(session.access_token);
    setRefunds(result.refunds);
    if (result.error) setError(result.error);
    setLoading(false);
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const applyStatus = async (
    id: string,
    status: "in_review" | "approved" | "rejected",
    notes?: string
  ) => {
    if (!session?.access_token) return;
    setBusyId(id);
    const result = await updateRefundStatus(session.access_token, id, status, notes);
    setBusyId(null);
    if (!result.ok) {
      Alert.alert("Error", result.error ?? "Could not update refund");
      return;
    }
    await load();
  };

  const openNotes = (id: string, status: "in_review" | "approved" | "rejected") => {
    setNotesModal({ id, status });
    setAdminNotes("");
  };

  const confirmNotes = async () => {
    if (!notesModal) return;
    await applyStatus(notesModal.id, notesModal.status, adminNotes.trim() || undefined);
    setNotesModal(null);
    setAdminNotes("");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard}>
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Refund Requests</ThemedText>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.light.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      ) : refunds.length === 0 ? (
        <ThemedText style={styles.emptyText}>No refund requests yet.</ThemedText>
      ) : (
        refunds.map((r) => (
          <View key={r.id} style={styles.card}>
            <ThemedText style={styles.cardTitle}>{r.reason}</ThemedText>
            <ThemedText style={styles.cardMeta}>
              {r.status.replace("_", " ")} · {new Date(r.created_at).toLocaleDateString()}
            </ThemedText>
            <ThemedText style={styles.cardDesc} numberOfLines={3}>
              {r.description}
            </ThemedText>
            {r.status === "pending" || r.status === "in_review" ? (
              <View style={styles.actionRow}>
                {(["in_review", "approved", "rejected"] as const).map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.actionBtn, busyId === r.id && styles.actionDisabled]}
                    onPress={() => openNotes(r.id, s)}
                    disabled={busyId === r.id}
                  >
                    <ThemedText style={styles.actionBtnText}>
                      {s === "in_review" ? "In Review" : s === "approved" ? "Approve" : "Reject"}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ))
      )}

      <Modal visible={notesModal != null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>Admin notes (optional)</ThemedText>
            <TextInput
              style={styles.modalInput}
              placeholder="Notes visible to user when applicable"
              placeholderTextColor={Colors.light.textMuted}
              value={adminNotes}
              onChangeText={setAdminNotes}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setNotesModal(null)}>
                <ThemedText style={styles.modalCancel}>Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={() => void confirmNotes()}>
                <ThemedText style={styles.modalConfirm}>Confirm</ThemedText>
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
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: Colors.light.text },
  cardMeta: { fontSize: 12, color: Colors.light.textMuted, marginTop: 4, textTransform: "capitalize" },
  cardDesc: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 8, lineHeight: 18 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: Spacing.md },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    minHeight: 36,
    justifyContent: "center",
  },
  actionDisabled: { opacity: 0.5 },
  actionBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
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
  modalConfirm: { color: Colors.light.accent, fontWeight: "600" },
});
