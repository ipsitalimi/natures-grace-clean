import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const CATEGORIES = ["Healings", "Counseling", "Therapies", "Spiritual Guidance"];

function sendApplicationToAdminEmail(data: Record<string, string>) {
  console.log("--- Practitioner Application Submitted ---");
  console.log("Simulating email to admin: naturesgrace.reiki@gmail.com");
  console.log("Application Data:", JSON.stringify(data, null, 2));
  console.log("--- End of simulated email ---");
}

export default function PractitionerApplicationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [submitted, setSubmitted] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [certifications, setCertifications] = useState("");
  const [sessionTypes, setSessionTypes] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [bio, setBio] = useState("");
  const [whyJoin, setWhyJoin] = useState("");
  const [availability, setAvailability] = useState("");

  const handleSubmit = () => {
    sendApplicationToAdminEmail({
      fullName,
      email,
      phone,
      category,
      experience,
      certifications,
      sessionTypes,
      priceRange,
      bio,
      whyJoin,
      availability,
    });
    setSubmitted(true);
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
            Your application has been sent to the Nature's Grace team for review.
          </ThemedText>
          <ThemedText style={styles.confirmationSubtext}>
            We'll contact you if your profile is approved.
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
      <View style={[styles.headerRow, { paddingTop: insets.top + Spacing.lg }]}>
        <Pressable style={styles.backButton} onPress={handleReturnToWellness} testID="button-back">
          <Feather name="arrow-left" size={20} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.screenTitle}>Practitioner Application</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.introText}>
          Share your practice with the Nature's Grace community.
        </ThemedText>

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

        <ThemedText style={styles.label}>Practice Category</ThemedText>
        <View style={styles.categoryChips}>
          {CATEGORIES.map((cat) => (
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

        <ThemedText style={styles.label}>Why do you want to join Nature's Grace?</ThemedText>
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

        <Pressable
          style={styles.submitButton}
          onPress={handleSubmit}
          testID="button-submit-application"
        >
          <ThemedText style={styles.submitButtonText}>Submit Application</ThemedText>
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
