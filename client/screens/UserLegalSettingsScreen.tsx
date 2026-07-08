import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Modal, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout } from "@/components/layout";
import LegalDocumentReader from "@/components/legal/LegalDocumentReader";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import { USER_SIGNUP_LEGAL_LABELS } from "@/constants/legalDocuments";
import { useAuth } from "@/context/AuthContext";
import {
  formatLegalTimestamp,
  parseProfileLegalAcceptance,
} from "@/services/legal/legalAcceptanceService";
import { fetchLegalAcceptanceHistory, type LegalAcceptanceEvent } from "@/services/legal/legalAcceptanceHistoryService";
import type { UserMandatoryLegalKey } from "@/types/legal";

function LegalRow({
  label,
  acceptedAt,
  version,
  onPress,
}: {
  label: string;
  acceptedAt: string;
  version: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowText}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        <ThemedText style={styles.rowMeta}>Accepted: {acceptedAt}</ThemedText>
        <ThemedText style={styles.rowMeta}>Version: {version ?? "—"}</ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
    </Pressable>
  );
}

export default function UserLegalSettingsScreen() {
  const { profile } = useAuth();
  const [viewingDoc, setViewingDoc] = useState<UserMandatoryLegalKey | null>(null);
  const [history, setHistory] = useState<LegalAcceptanceEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setHistoryLoading(true);
      const rows = await fetchLegalAcceptanceHistory();
      setHistory(rows);
      setHistoryLoading(false);
    })();
  }, [profile?.id]);

  if (!profile) {
    return null;
  }

  const acceptance = parseProfileLegalAcceptance(profile);

  return (
    <>
      <PageLayout
        title="Legal & Policies"
        titleInHeader
        header="back"
        contentContainerStyle={styles.content}
      >
        {(Object.keys(USER_SIGNUP_LEGAL_LABELS) as UserMandatoryLegalKey[]).map((key) => {
          const record = acceptance[key];
          return (
            <LegalRow
              key={key}
              label={USER_SIGNUP_LEGAL_LABELS[key]}
              acceptedAt={formatLegalTimestamp(record.timestamp)}
              version={record.version}
              onPress={() => setViewingDoc(key)}
            />
          );
        })}

        <ThemedText style={styles.historyTitle}>Acceptance history</ThemedText>
        {historyLoading ? (
          <ActivityIndicator color={Colors.light.accent} style={{ marginVertical: 16 }} />
        ) : history.length === 0 ? (
          <ThemedText style={styles.historyEmpty}>
            Full acceptance history will appear here after you accept updated policies.
          </ThemedText>
        ) : (
          history.map((event) => (
            <View key={event.id} style={styles.historyRow}>
              <ThemedText style={styles.historyDoc}>{event.documentKey.replace(/_/g, " ")}</ThemedText>
              <ThemedText style={styles.historyMeta}>
                v{event.documentVersion} · {event.acceptedRole} ·{" "}
                {formatLegalTimestamp(event.acceptedAt)}
              </ThemedText>
            </View>
          ))
        )}
      </PageLayout>

      <Modal visible={viewingDoc !== null} animationType="slide" onRequestClose={() => setViewingDoc(null)}>
        {viewingDoc ? (
          <LegalDocumentReader docKey={viewingDoc} onBack={() => setViewingDoc(null)} />
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: LayoutSpacing.xs,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: LayoutSpacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  rowText: { flex: 1, paddingRight: LayoutSpacing.sm },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  rowMeta: {
    fontSize: 12,
    color: Colors.light.textMuted,
    lineHeight: 18,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: LayoutSpacing.xl,
    marginBottom: LayoutSpacing.sm,
  },
  historyEmpty: { fontSize: 13, color: Colors.light.textMuted, lineHeight: 18 },
  historyRow: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: LayoutSpacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    marginBottom: 8,
  },
  historyDoc: { fontSize: 14, fontWeight: "600", color: Colors.light.text, textTransform: "capitalize" },
  historyMeta: { fontSize: 12, color: Colors.light.textMuted, marginTop: 4 },
});
