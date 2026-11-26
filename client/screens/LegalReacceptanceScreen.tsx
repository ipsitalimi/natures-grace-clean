import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import LegalDocumentReader from "@/components/legal/LegalDocumentReader";
import { USER_SIGNUP_LEGAL_LABELS } from "@/constants/legalDocuments";
import { useAuth } from "@/context/AuthContext";
import {
  buildAcceptanceInputs,
  fetchLegalVersions,
  getPendingUserLegalKeys,
  parseProfileLegalAcceptance,
  recordLegalAcceptances,
} from "@/services/legal/legalAcceptanceService";
import type { UserMandatoryLegalKey } from "@/types/legal";
import { getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

export default function LegalReacceptanceScreen() {
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile, markLegalAcceptancesCurrent } = useAuth();

  const [versions, setVersions] = useState<Awaited<ReturnType<typeof fetchLegalVersions>> | null>(null);
  const [pendingKeys, setPendingKeys] = useState<UserMandatoryLegalKey[]>([]);
  const [acceptedAll, setAcceptedAll] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<UserMandatoryLegalKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const v = await fetchLegalVersions();
      setVersions(v);
      if (profile) {
        const acceptance = parseProfileLegalAcceptance(profile);
        const pending = getPendingUserLegalKeys(acceptance, v);
        setPendingKeys(pending);
      }
    })();
  }, [profile]);

  const visibleKeys = pendingKeys;

  // One consolidated acceptance, matching the signup screen. Users can
  // still open each document to read it without ticking every policy.
  const allChecked = useMemo(
    () => visibleKeys.length > 0 && acceptedAll,
    [visibleKeys.length, acceptedAll]
  );

  const handleContinue = async () => {
    if (!allChecked || !versions || submitting || visibleKeys.length === 0) return;
    setError("");
    setSubmitting(true);

    const recordResult = await recordLegalAcceptances(
      buildAcceptanceInputs(visibleKeys, versions)
    );

    if (!recordResult.ok) {
      setSubmitting(false);
      setError(recordResult.error ?? "Could not save legal acceptances");
      return;
    }

    markLegalAcceptancesCurrent(visibleKeys, versions);
    await refreshProfile();
    setSubmitting(false);
  };

  if (!profile || !versions) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={Colors.light.accent} size="large" />
      </View>
    );
  }

  if (visibleKeys.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: getAuthScreenPaddingTop(insets.top),
          paddingBottom: getScrollBottomPadding(insets.bottom, 20),
        },
      ]}
    >
      <View style={styles.titleSection}>
        <ThemedText style={styles.title}>We've updated our Terms and Policies.</ThemedText>
        <ThemedText style={styles.subtitle}>
          Please review and accept the updated documents before continuing to use Nature's Grace.
        </ThemedText>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {visibleKeys.map((key) => (
          <Pressable
            key={key}
            style={styles.policyLink}
            onPress={() => setViewingDoc(key)}
            accessibilityRole="button"
            testID={`link-reaccept-${key}`}
          >
            <ThemedText style={styles.policyLinkText}>
              {USER_SIGNUP_LEGAL_LABELS[key]}
            </ThemedText>
            <ThemedText style={styles.policyLinkArrow}>›</ThemedText>
          </Pressable>
        ))}
        <Pressable
          style={styles.acceptRow}
          onPress={() => setAcceptedAll((value) => !value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedAll }}
          testID="checkbox-reaccept-all-legal"
        >
          <View style={[styles.checkbox, acceptedAll && styles.checkboxChecked]}>
            {acceptedAll ? <ThemedText style={styles.checkmark}>✓</ThemedText> : null}
          </View>
          <ThemedText style={styles.acceptText}>
            I have reviewed and agree to all the updated policies listed above.
          </ThemedText>
        </Pressable>
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      </ScrollView>

      <Pressable
        style={[styles.primaryButton, (!allChecked || submitting) && styles.primaryButtonDisabled]}
        onPress={() => void handleContinue()}
        disabled={!allChecked || submitting}
        testID="button-reaccept-continue"
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.primaryButtonText}>Continue</ThemedText>
        )}
      </Pressable>

      <Modal visible={viewingDoc !== null} animationType="slide" onRequestClose={() => setViewingDoc(null)}>
        {viewingDoc ? (
          <LegalDocumentReader
            docKey={viewingDoc}
            onBack={() => setViewingDoc(null)}
            footer={
              <Pressable
                style={styles.modalDoneBtn}
                onPress={() => {
                  setViewingDoc(null);
                }}
              >
                <ThemedText style={styles.modalDoneText}>I Agree</ThemedText>
              </Pressable>
            }
          />
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundRoot,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: Spacing["2xl"],
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    textAlign: "center",
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    includeFontPadding: false,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.lg },
  policyLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  policyLinkText: { fontSize: 14, color: Colors.light.accent, fontWeight: "500" },
  policyLinkArrow: { fontSize: 22, color: Colors.light.accent },
  acceptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
  checkmark: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  acceptText: { flex: 1, fontSize: 14, lineHeight: 20, color: Colors.light.text },
  errorText: {
    fontSize: 14,
    color: "#C0392B",
    textAlign: "center",
    marginTop: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  modalDoneBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalDoneText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
