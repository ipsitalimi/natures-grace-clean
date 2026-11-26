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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import LegalDocumentReader from "@/components/legal/LegalDocumentReader";
import { Feather } from "@expo/vector-icons";
import { USER_SIGNUP_LEGAL_LABELS } from "@/constants/legalDocuments";
import { useAuth } from "@/context/AuthContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import {
  buildAcceptanceInputs,
  fetchLegalVersions,
  recordLegalAcceptances,
} from "@/services/legal/legalAcceptanceService";
import type { LegalVersions, UserMandatoryLegalKey } from "@/types/legal";
import { getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

type RouteProps = RouteProp<RootStackParamList, "SignupLegal">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "SignupLegal">;

export default function SignupLegalScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { name, email, password } = route.params;
  const { signUp, refreshProfile, setPendingSignupLegal, markLegalAcceptancesCurrent } = useAuth();
  const { syncSessionFromProfile } = usePlatformConfig();

  const [versions, setVersions] = useState<LegalVersions | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<UserMandatoryLegalKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchLegalVersions().then((v) => setVersions(v));
  }, []);

  const legalKeys = useMemo(() => Object.keys(USER_SIGNUP_LEGAL_LABELS) as UserMandatoryLegalKey[], []);

  const handleContinue = async () => {
    if (!accepted || !versions || submitting) return;
    setError("");
    setSubmitting(true);

    try {
      const signupResult = await signUp(email, password, name);
      if (signupResult.error) {
        setError(signupResult.error);
        return;
      }

      if (signupResult.needsEmailConfirmation) {
        setPendingSignupLegal({ keys: legalKeys, versions });
        navigation.reset({
          index: 0,
          routes: [{ name: "VerifyEmail", params: { email } }],
        });
        return;
      }

      const recordResult = await recordLegalAcceptances(
        buildAcceptanceInputs(legalKeys, versions)
      );

      if (!recordResult.ok) {
        setPendingSignupLegal({ keys: legalKeys, versions });
        setError(
          recordResult.error ??
            "Your account was created, but we couldn't save the policy acceptance. Please sign in and contact support if this continues."
        );
        return;
      }

      // Update the in-memory profile immediately after the database confirms acceptance.
      // This prevents RootNavigation from seeing stale policy versions and routing
      // the new user straight into the separate "updated policies" screen.
      markLegalAcceptancesCurrent(legalKeys, versions);
      const updatedProfile = (await refreshProfile()) ?? signupResult.profile ?? null;
      if (updatedProfile) {
        syncSessionFromProfile(updatedProfile);
      }

      // Make the destination explicit rather than leaving the user on the
      // legal screen while the global auth navigator catches up.
      navigation.reset({
        index: 0,
        routes: [{ name: signupResult.route ?? "Main" }],
      });
    } catch (err) {
      console.error("[SignupLegal] account creation failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't finish creating your account. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

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
        <ThemedText style={styles.title}>Legal Agreements</ThemedText>
        <ThemedText style={styles.subtitle}>
          Please review and accept all policies to create your account.
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!versions ? (
          <ActivityIndicator color={Colors.light.accent} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.policyList}>
            <ThemedText style={styles.policyHeading}>Review the policies</ThemedText>
            {legalKeys.map((key) => (
              <Pressable key={key} style={styles.policyLink} onPress={() => setViewingDoc(key)}>
                <ThemedText style={styles.policyLinkText}>{USER_SIGNUP_LEGAL_LABELS[key]}</ThemedText>
                <Feather name="chevron-right" size={17} color={Colors.light.accent} />
              </Pressable>
            ))}
            <Pressable style={styles.acceptRow} onPress={() => setAccepted((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} testID="checkbox-accept-all-legal">
              <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                {accepted ? <Feather name="check" size={15} color="#FFFFFF" /> : null}
              </View>
              <ThemedText style={styles.acceptText}>I have read and agree to all the above policies and terms.</ThemedText>
            </Pressable>
          </View>
        )}

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      </ScrollView>

      <Pressable
        style={[styles.primaryButton, (!accepted || submitting) && styles.primaryButtonDisabled]}
        onPress={() => void handleContinue()}
        disabled={!accepted || submitting || !versions}
        testID="button-signup-legal-continue"
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.primaryButtonText}>Create Account</ThemedText>
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
                <ThemedText style={styles.modalDoneText}>Done</ThemedText>
              </Pressable>
            }
          />
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  policyList: { gap: 2 },
  policyHeading: { fontSize: 15, fontWeight: "700", color: Colors.light.text, marginBottom: Spacing.sm },
  policyLink: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.light.divider },
  policyLinkText: { fontSize: 14, color: Colors.light.accent, fontWeight: "500" },
  acceptRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: Spacing.lg, marginTop: Spacing.md },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: Colors.light.accent, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
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
