import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ScreenHeader } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAppBrandCopy } from "@/hooks/useAppBrandCopy";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import RoleAgreementSection from "@/components/legal/RoleAgreementSection";
import {
  buildAcceptanceInputs,
  fetchLegalVersions,
  isPractitionerAgreementCurrent,
  parseProfileLegalAcceptance,
  recordLegalAcceptances,
} from "@/services/legal/legalAcceptanceService";
import { submitRoleApplication } from "@/services/platform/roleApplicationsService";
import { uploadApplicationDocuments } from "@/services/platform/applicationDocumentsService";
import ApplicationDocumentsSection from "@/components/ApplicationDocumentsSection";
import PractitionerCategoryFields from "@/components/PractitionerCategoryFields";
import type { LocalFile } from "@/lib/storageUpload";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";

export default function PractitionerApplicationScreen() {
  const { scrollPaddingBottom } = useLayoutInsets(30);
  const navigation = useNavigation();
  const { appNameDisplay } = useAppBrandCopy();
  const { session, profile, refreshProfile } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [agreementCurrent, setAgreementCurrent] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [certifications, setCertifications] = useState("");
  const [sessionTypes, setSessionTypes] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [bio, setBio] = useState("");
  const [whyJoin, setWhyJoin] = useState("");
  const [pendingDocs, setPendingDocs] = useState<LocalFile[]>([]);
  const [availability, setAvailability] = useState("");

  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name);
      if (profile.email) setEmail(profile.email);
      if (profile.phone) setPhone(profile.phone);
    }
  }, [profile?.full_name, profile?.email, profile?.phone]);

  useEffect(() => {
    if (!profile) return;
    void (async () => {
      const versions = await fetchLegalVersions();
      const acceptance = parseProfileLegalAcceptance(profile);
      const current = isPractitionerAgreementCurrent(acceptance, versions);
      setAgreementCurrent(current);
      if (current) setAgreementChecked(true);
    })();
  }, [profile]);

  const canSubmit = isSupabaseConfigured() && Boolean(session?.user);
  const agreementReady = agreementCurrent || agreementChecked;

  const handleSubmit = async () => {
    if (!canSubmit || submitting || !agreementReady) return;
    if (!fullName.trim() || !email.trim() || !category || subcategories.length === 0) {
      setSubmitError("Please fill in your name, email, practice category, and at least one service.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!agreementCurrent) {
        const versions = await fetchLegalVersions();
        const recordResult = await recordLegalAcceptances(
          buildAcceptanceInputs(["practitioner_agreement"], versions)
        );
        if (!recordResult.ok) {
          throw new Error(recordResult.error ?? "Could not record Practitioner Agreement acceptance");
        }
        await refreshProfile();
      }

      const application = await submitRoleApplication("Practitioner", {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        category,
        subcategories: subcategories.join(", "),
        subcategory: subcategories[0] ?? "",
        experience: experience.trim(),
        certifications: certifications.trim(),
        sessionTypes: sessionTypes.trim(),
        priceRange: priceRange.trim(),
        bio: bio.trim(),
        whyJoin: whyJoin.trim(),
        availability: availability.trim(),
      });
      if (pendingDocs.length && application) {
        const uploadResult = await uploadApplicationDocuments(
          application.id,
          pendingDocs,
          "practitioner_credentials"
        );
        if (uploadResult.errors.length) {
          console.warn("[PractitionerApplication] document upload:", uploadResult.errors.join("; "));
        }
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnToWellness = () => {
    navigation.goBack();
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmationContainer}>
          <View style={styles.confirmationIconCircle}>
            <Feather name="check" size={36} color={Colors.light.accent} />
          </View>
          <ThemedText style={styles.confirmationTitle}>Application Submitted</ThemedText>
          <ThemedText style={styles.confirmationMessage}>
            Your application has been sent to the {appNameDisplay} team for review.
          </ThemedText>
          <ThemedText style={styles.confirmationSubtext}>
            We'll contact you if your profile is approved. To offer another service, submit a
            separate application after this one is reviewed.
          </ThemedText>
          <Pressable
            style={styles.returnButton}
            onPress={handleReturnToWellness}
            testID="button-return-wellness"
          >
            <ThemedText style={styles.returnButtonText}>Return to Wellness</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        variant="back"
        showNotifications={false}
        onBackPress={handleReturnToWellness}
        center={
          <ThemedText
            style={styles.screenTitle}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            maxFontSizeMultiplier={1.25}
          >
            Become a Practitioner
          </ThemedText>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={styles.introText}>
          Share your practice with the {appNameDisplay} community.
        </ThemedText>

        {!canSubmit ? (
          <ThemedText style={styles.hintText} testID="text-practitioner-sign-in">
            {isSupabaseConfigured()
              ? "Sign in to submit your practitioner application."
              : "Applications require a connected account."}
          </ThemedText>
        ) : null}

        {submitError ? (
          <ThemedText style={styles.errorText} testID="text-practitioner-submit-error">
            {submitError}
          </ThemedText>
        ) : null}

        <ThemedText style={styles.label}>Full Name</ThemedText>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
          placeholderTextColor={Colors.light.textMuted}
          testID="input-full-name"
        />

        <ThemedText style={styles.label}>Email Address</ThemedText>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={Colors.light.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          testID="input-email"
        />

        <ThemedText style={styles.label}>Phone Number</ThemedText>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Your phone number"
          placeholderTextColor={Colors.light.textMuted}
          keyboardType="phone-pad"
          testID="input-phone"
        />

        <PractitionerCategoryFields
          category={category}
          subcategories={subcategories}
          onCategoryChange={setCategory}
          onSubcategoriesChange={setSubcategories}
          showSingleApplicationHint
        />

        <ThemedText style={styles.label}>Years of Experience</ThemedText>
        <TextInput
          style={styles.input}
          value={experience}
          onChangeText={setExperience}
          placeholder="e.g., 5 years"
          placeholderTextColor={Colors.light.textMuted}
          testID="input-experience"
        />

        <ThemedText style={styles.label}>Certifications / Training</ThemedText>
        <TextInput
          style={styles.input}
          value={certifications}
          onChangeText={setCertifications}
          placeholder="e.g., Reiki Level 3, CBT Certified"
          placeholderTextColor={Colors.light.textMuted}
          testID="input-certifications"
        />

        <ThemedText style={styles.label}>Session Types Offered</ThemedText>
        <TextInput
          style={styles.input}
          value={sessionTypes}
          onChangeText={setSessionTypes}
          placeholder="e.g., In-person, Virtual"
          placeholderTextColor={Colors.light.textMuted}
          testID="input-session-types"
        />

        <ThemedText style={styles.label}>Session Price Range</ThemedText>
        <TextInput
          style={styles.input}
          value={priceRange}
          onChangeText={setPriceRange}
          placeholder="e.g., $50 - $120"
          placeholderTextColor={Colors.light.textMuted}
          testID="input-price-range"
        />

        <ThemedText style={styles.label}>Short Bio</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself and your practice"
          placeholderTextColor={Colors.light.textMuted}
          multiline
          numberOfLines={4}
          testID="input-bio"
        />

        <ThemedText style={styles.label}>Why do you want to join {appNameDisplay}?</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={whyJoin}
          onChangeText={setWhyJoin}
          placeholder="Share your motivation for joining"
          placeholderTextColor={Colors.light.textMuted}
          multiline
          numberOfLines={4}
          testID="input-why-join"
        />

        <ThemedText style={styles.label}>Availability Notes (optional)</ThemedText>
        <TextInput
          style={styles.input}
          value={availability}
          onChangeText={setAvailability}
          placeholder="e.g., Weekdays 9am-5pm"
          placeholderTextColor={Colors.light.textMuted}
          testID="input-availability"
        />

        <ApplicationDocumentsSection
          files={pendingDocs}
          onChange={setPendingDocs}
          disabled={submitting}
          title="Credentials & documents"
          hint="Upload certifications, licenses, or ID (PDF or image)."
        />

        {!agreementCurrent ? (
          <RoleAgreementSection
            docKey="practitioner_agreement"
            checked={agreementChecked}
            onCheckedChange={setAgreementChecked}
          />
        ) : null}

        <Pressable
          style={[styles.submitButton, !canSubmit || submitting || !agreementReady ? styles.submitButtonDisabled : null]}
          onPress={() => void handleSubmit()}
          disabled={!canSubmit || submitting || !agreementReady}
          testID="button-submit-application"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.submitButtonText}>Submit Application</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  screenTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    textAlign: "center",
    width: "100%",
    flexShrink: 1,
    includeFontPadding: false,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  introText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  hintText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#B33A3A",
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    backgroundColor: Colors.light.cardBackground,
  },
  chipSelected: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  confirmationContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  confirmationIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(1, 50, 32, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  confirmationTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  confirmationMessage: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  confirmationSubtext: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  returnButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["3xl"],
    alignItems: "center",
  },
  returnButtonText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
