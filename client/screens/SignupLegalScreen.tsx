import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import LegalDocumentReader, { LegalCheckboxRow } from "@/components/legal/LegalDocumentReader";
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
  const { signUp, refreshProfile, setPendingSignupLegal } = useAuth();
  const { syncSessionFromProfile } = usePlatformConfig();

  const [versions, setVersions] = useState<LegalVersions | null>(null);
  const [checked, setChecked] = useState<Record<UserMandatoryLegalKey, boolean>>({
    user_terms: false,
    privacy_policy: false,
    refund_policy: false,
    medical_disclaimer: false,
    account_deletion_policy: false,
    grievance_policy: false,
    community_guidelines: false,
    shipping_policy: false,
  });
  const [viewingDoc, setViewingDoc] = useState<UserMandatoryLegalKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchLegalVersions().then((v) => setVersions(v));
  }, []);

  const allChecked = useMemo(
    () => Object.values(checked).every(Boolean),
    [checked]
  );

  const toggle = useCallback((key: UserMandatoryLegalKey) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleContinue = async () => {
    if (!allChecked || !versions || submitting) return;
    setError("");
    setSubmitting(true);

    const signupResult = await signUp(email, password, name);
    if (signupResult.error) {
      setSubmitting(false);
      setError(signupResult.error);
      return;
    }

    if (signupResult.needsEmailConfirmation) {
      const keys = Object.keys(checked) as UserMandatoryLegalKey[];
      setPendingSignupLegal({ keys, versions });
      setSubmitting(false);
      navigation.reset({
        index: 0,
        routes: [{ name: "VerifyEmail", params: { email } }],
      });
      return;
    }

    const keys = Object.keys(checked) as UserMandatoryLegalKey[];
    const recordResult = await recordLegalAcceptances(
      buildAcceptanceInputs(keys, versions)
    );

    if (!recordResult.ok) {
      const keys = Object.keys(checked) as UserMandatoryLegalKey[];
      setPendingSignupLegal({ keys, versions });
      setSubmitting(false);
      setError(
        recordResult.error ??
          "Account created, but legal acceptances could not be saved. Sign in to complete setup."
      );
      return;
    }

    const updatedProfile = await refreshProfile();
    if (updatedProfile) {
      syncSessionFromProfile(updatedProfile);
    } else if (signupResult.profile) {
      syncSessionFromProfile(signupResult.profile);
    }
    setSubmitting(false);
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
          (Object.keys(USER_SIGNUP_LEGAL_LABELS) as UserMandatoryLegalKey[]).map((key) => (
            <LegalCheckboxRow
              key={key}
              label={USER_SIGNUP_LEGAL_LABELS[key]}
              checked={checked[key]}
              onToggle={() => toggle(key)}
              onView={() => setViewingDoc(key)}
              testID={`checkbox-legal-${key}`}
            />
          ))
        )}

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      </ScrollView>

      <Pressable
        style={[styles.primaryButton, (!allChecked || submitting) && styles.primaryButtonDisabled]}
        onPress={() => void handleContinue()}
        disabled={!allChecked || submitting || !versions}
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
                  toggle(viewingDoc);
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
