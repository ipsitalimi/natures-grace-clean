import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import {
  fetchMyRefundRequests,
  submitRefundRequest,
  type RefundRequest,
} from "@/services/refundRequestsService";

type ParamList = {
  RefundRequest: { orderId?: string; bookingId?: string };
};

const REASONS = [
  "Item not received",
  "Damaged or defective",
  "Wrong item",
  "Session issue",
  "Other",
] as const;

function StatusTimeline({ requests }: { requests: RefundRequest[] }) {
  if (requests.length === 0) return null;
  return (
    <View style={styles.timeline}>
      <ThemedText style={styles.sectionTitle}>Your requests</ThemedText>
      {requests.map((r) => (
        <View key={r.id} style={styles.timelineItem}>
          <ThemedText style={styles.timelineStatus}>{r.status.replace("_", " ")}</ThemedText>
          <ThemedText style={styles.timelineMeta}>
            {r.reason} · {new Date(r.createdAt).toLocaleDateString()}
          </ThemedText>
          {r.adminNotes ? (
            <ThemedText style={styles.timelineNote}>Note: {r.adminNotes}</ThemedText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function RefundRequestScreen() {
  const route = useRoute<RouteProp<ParamList, "RefundRequest">>();
  const { orderId, bookingId } = route.params ?? {};

  const [reason, setReason] = useState<string>(REASONS[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RefundRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const rows = await fetchMyRefundRequests();
      const filtered = rows.filter(
        (r) =>
          (orderId && r.orderId === orderId) ||
          (bookingId && r.bookingId === bookingId) ||
          (!orderId && !bookingId)
      );
      setHistory(filtered);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [orderId, bookingId]);

  React.useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError("Please describe the issue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitRefundRequest({
        orderId,
        bookingId,
        reason,
        description: description.trim(),
      });
      Alert.alert(
        "Request submitted",
        "Our team will review your refund request and notify you of the outcome."
      );
      setDescription("");
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout
      title="Refund Request"
      titleInHeader
      header="back"
      contentContainerStyle={styles.content}
    >
      <ThemedText style={styles.intro}>
        Submit a refund request with details. Our team reviews requests per the Refund Policy.
      </ThemedText>

      <ThemedText style={styles.label}>Reason</ThemedText>
      <View style={styles.reasonRow}>
        {REASONS.map((r) => (
          <Pressable
            key={r}
            style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
            onPress={() => setReason(r)}
          >
            <ThemedText style={[styles.reasonText, reason === r && styles.reasonTextActive]}>
              {r}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText style={styles.label}>Description</ThemedText>
      <TextInput
        style={styles.textArea}
        multiline
        placeholder="Describe what happened…"
        placeholderTextColor={Colors.light.textMuted}
        value={description}
        onChangeText={setDescription}
      />

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      <Pressable
        style={[styles.submitBtn, submitting && styles.submitDisabled]}
        onPress={() => void handleSubmit()}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.submitText}>Submit request</ThemedText>
        )}
      </Pressable>

      {loadingHistory ? (
        <ActivityIndicator color={Colors.light.accent} style={{ marginTop: 24 }} />
      ) : (
        <StatusTimeline requests={history} />
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: LayoutSpacing.xs,
  },
  intro: { fontSize: 14, color: Colors.light.textMuted, lineHeight: 20, marginBottom: LayoutSpacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: Colors.light.text, marginBottom: 8 },
  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: LayoutSpacing.lg },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  reasonChipActive: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
  reasonText: { fontSize: 12, color: Colors.light.text },
  reasonTextActive: { color: "#fff", fontWeight: "600" },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    borderRadius: BorderRadius.sm,
    padding: LayoutSpacing.md,
    fontSize: 14,
    color: Colors.light.text,
    textAlignVertical: "top",
    marginBottom: LayoutSpacing.lg,
  },
  submitBtn: {
    backgroundColor: Colors.light.accent,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontWeight: "600" },
  errorText: { color: "#8B3A3A", marginBottom: LayoutSpacing.md },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    marginBottom: LayoutSpacing.sm,
    marginTop: LayoutSpacing.lg,
  },
  timeline: { gap: 8 },
  timelineItem: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: LayoutSpacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  timelineStatus: { fontSize: 14, fontWeight: "600", color: Colors.light.text, textTransform: "capitalize" },
  timelineMeta: { fontSize: 12, color: Colors.light.textMuted, marginTop: 4 },
  timelineNote: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 6 },
});
