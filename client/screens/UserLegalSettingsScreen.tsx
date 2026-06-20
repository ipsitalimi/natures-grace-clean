import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import LegalDocumentReader from "@/components/legal/LegalDocumentReader";
import { USER_SIGNUP_LEGAL_LABELS } from "@/constants/legalDocuments";
import { useAuth } from "@/context/AuthContext";
import {
  formatLegalTimestamp,
  parseProfileLegalAcceptance,
} from "@/services/legal/legalAcceptanceService";
import { fetchLegalAcceptanceHistory, type LegalAcceptanceEvent } from "@/services/legal/legalAcceptanceHistoryService";
import type { UserMandatoryLegalKey } from "@/types/legal";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";

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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
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
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Legal & Policies</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getScrollBottomPadding(insets.bottom, 24) },
        ]}
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
      </ScrollView>

      <Modal visible={viewingDoc !== null} animationType="slide" onRequestClose={() => setViewingDoc(null)}>
        {viewingDoc ? (
          <LegalDocumentReader docKey={viewingDoc} onBack={() => setViewingDoc(null)} />
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 8,
  },
  headerIconButton: { padding: 8 },
  headerCenter: { flex: 1 },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  rowText: { flex: 1, paddingRight: Spacing.sm },
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
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  historyEmpty: { fontSize: 13, color: Colors.light.textMuted, lineHeight: 18 },
  historyRow: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    marginBottom: 8,
  },
  historyDoc: { fontSize: 14, fontWeight: "600", color: Colors.light.text, textTransform: "capitalize" },
  historyMeta: { fontSize: 12, color: Colors.light.textMuted, marginTop: 4 },
});
