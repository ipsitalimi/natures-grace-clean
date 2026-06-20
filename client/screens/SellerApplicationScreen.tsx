import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAppBrandCopy } from "@/hooks/useAppBrandCopy";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import RoleAgreementSection from "@/components/legal/RoleAgreementSection";
import {
  buildAcceptanceInputs,
  fetchLegalVersions,
  isSellerAgreementCurrent,
  parseProfileLegalAcceptance,
  recordLegalAcceptances,
} from "@/services/legal/legalAcceptanceService";
import { submitRoleApplication } from "@/services/platform/roleApplicationsService";
import { uploadApplicationDocuments } from "@/services/platform/applicationDocumentsService";
import ApplicationDocumentsSection from "@/components/ApplicationDocumentsSection";
import type { LocalFile } from "@/lib/storageUpload";
import { getHeaderPaddingTop, getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

const PRODUCT_CATEGORIES = ["Wellness Essentials", "Herbal & Organic", "Mindfulness Tools", "Skincare & Body", "Nutrition & Supplements", "Home & Living"];

export default function SellerApplicationScreen() {
  const insets = useSafeAreaInsets();
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
  const [brandName, setBrandName] = useState("");
  const [category, setCategory] = useState("");
  const [productTypes, setProductTypes] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [whyJoin, setWhyJoin] = useState("");
  const [pendingDocs, setPendingDocs] = useState<LocalFile[]>([]);

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
      const current = isSellerAgreementCurrent(acceptance, versions);
      setAgreementCurrent(current);
      if (current) setAgreementChecked(true);
    })();
  }, [profile]);

  const canSubmit = isSupabaseConfigured() && Boolean(session?.user);
  const agreementReady = agreementCurrent || agreementChecked;

  const handleSubmit = async () => {
    if (!canSubmit || submitting || !agreementReady) return;
    if (!fullName.trim() || !email.trim() || !brandName.trim() || !category) {
      setSubmitError("Please fill in your name, email, brand name, and product category.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!agreementCurrent) {
        const versions = await fetchLegalVersions();
        const recordResult = await recordLegalAcceptances(
          buildAcceptanceInputs(["seller_agreement"], versions)
        );
        if (!recordResult.ok) {
          throw new Error(recordResult.error ?? "Could not record Seller Agreement acceptance");
        }
        await refreshProfile();
      }

      const application = await submitRoleApplication("Seller", {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        brandName: brandName.trim(),
        category,
        productTypes: productTypes.trim(),
        description: description.trim(),
        website: website.trim(),
        whyJoin: whyJoin.trim(),
      });
      if (pendingDocs.length && application) {
        const uploadResult = await uploadApplicationDocuments(application.id, pendingDocs, "seller_supporting");
        if (uploadResult.errors.length) {
          console.warn("[SellerApplication] document upload:", uploadResult.errors.join("; "));
        }
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = () => {
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
            Your seller application has been sent to the {appNameDisplay} team for review.
          </ThemedText>
          <ThemedText style={styles.confirmationSubtext}>
            We'll contact you once your store profile is approved.
          </ThemedText>
          <Pressable
            style={styles.returnButton}
            onPress={handleReturn}
            testID="button-return-store"
          >
            <ThemedText style={styles.returnButtonText}>Return to Store</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) + Spacing.sm }]}>
        <Pressable style={styles.backButton} onPress={handleReturn} testID="button-back">
          <Feather name="arrow-left" size={20} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.screenTitle}>Become a Seller</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 30) }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.introText}>
          Sell your wellness products through the {appNameDisplay} community.
        </ThemedText>

        {!canSubmit ? (
          <ThemedText style={styles.hintText} testID="text-seller-sign-in">
            {isSupabaseConfigured()
              ? "Sign in to submit your seller application."
              : "Applications require a connected account."}
          </ThemedText>
        ) : null}

        {submitError ? (
          <ThemedText style={styles.errorText} testID="text-seller-submit-error">
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
          testID="input-seller-full-name"
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
          testID="input-seller-email"
        />

        <ThemedText style={styles.label}>Phone Number</ThemedText>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Your phone number"
          placeholderTextColor={Colors.light.textMuted}
          keyboardType="phone-pad"
          testID="input-seller-phone"
        />

        <ThemedText style={styles.label}>Brand / Store Name</ThemedText>
        <TextInput
          style={styles.input}
          value={brandName}
          onChangeText={setBrandName}
          placeholder="Your brand or store name"
          placeholderTextColor={Colors.light.textMuted}
          testID="input-seller-brand"
        />

        <ThemedText style={styles.label}>Product Category</ThemedText>
        <View style={styles.categoryChips}>
          {PRODUCT_CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.chip, category === cat ? styles.chipSelected : null]}
              onPress={() => setCategory(cat)}
              testID={`chip-${cat.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <ThemedText
                style={[styles.chipText, category === cat ? styles.chipTextSelected : null]}
              >
                {cat}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText style={styles.label}>Types of Products</ThemedText>
        <TextInput
          style={styles.input}
          value={productTypes}
          onChangeText={setProductTypes}
          placeholder="e.g., Essential oils, Herbal teas, Yoga mats"
          placeholderTextColor={Colors.light.textMuted}
          testID="input-seller-product-types"
        />

        <ThemedText style={styles.label}>About Your Products</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Tell us about your products and what makes them special"
          placeholderTextColor={Colors.light.textMuted}
          multiline
          numberOfLines={4}
          testID="input-seller-description"
        />

        <ThemedText style={styles.label}>Website or Social Media (optional)</ThemedText>
        <TextInput
          style={styles.input}
          value={website}
          onChangeText={setWebsite}
          placeholder="e.g., www.yourbrand.com"
          placeholderTextColor={Colors.light.textMuted}
          autoCapitalize="none"
          testID="input-seller-website"
        />

        <ThemedText style={styles.label}>Why do you want to sell on {appNameDisplay}?</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={whyJoin}
          onChangeText={setWhyJoin}
          placeholder="Share your motivation for joining"
          placeholderTextColor={Colors.light.textMuted}
          multiline
          numberOfLines={4}
          testID="input-seller-why-join"
        />

        <ApplicationDocumentsSection
          files={pendingDocs}
          onChange={setPendingDocs}
          disabled={submitting}
        />

        {!agreementCurrent ? (
          <RoleAgreementSection
            docKey="seller_agreement"
            checked={agreementChecked}
            onCheckedChange={setAgreementChecked}
          />
        ) : null}

        <Pressable
          style={[styles.submitButton, !canSubmit || submitting || !agreementReady ? styles.submitButtonDisabled : null]}
          onPress={() => void handleSubmit()}
          disabled={!canSubmit || submitting || !agreementReady}
          testID="button-submit-seller-application"
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
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
