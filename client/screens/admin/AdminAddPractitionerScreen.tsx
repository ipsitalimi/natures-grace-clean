import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";
import { fetchProfileByEmail } from "@/services/profileService";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

export default function AdminAddPractitionerScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const { addPractitioner } = useDataContext();
  const [profileEmail, setProfileEmail] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [experience, setExperience] = useState("");
  const [certifications, setCertifications] = useState("");
  const [price, setPrice] = useState("");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setError("");
    if (!profileEmail.trim() || !name.trim() || !category.trim()) {
      setError("User email, name, and category are required.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Connect Supabase to add practitioners.");
      return;
    }

    setSaving(true);
    const profile = await fetchProfileByEmail(profileEmail);
    if (!profile) {
      setSaving(false);
      setError("No user profile found for that email. The person must sign up first.");
      return;
    }

    await addPractitioner({
      profileId: profile.id,
      name: name.trim(),
      category: category.trim(),
      subcategory: subcategory.trim() || category.trim(),
      bio: bio.trim() || `${name.trim()} is a dedicated wellness practitioner specializing in ${category.trim()}.`,
      experience: experience.trim() || "1+ years",
      certifications: certifications
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      rating: 5.0,
      pricePerSession: parseInt(price, 10) || 1000,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onBack();
    }, 1500);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable
          style={styles.backButton}
          onPress={onBack}
          testID="button-back"
        >
          <Feather name="arrow-left" size={22} color={Colors.light.text} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Add Practitioner</ThemedText>
      </View>

      <View style={styles.formGroup}>
        <ThemedText style={styles.label}>User email *</ThemedText>
        <TextInput
          style={styles.input}
          value={profileEmail}
          onChangeText={setProfileEmail}
          placeholder="existing-user@email.com"
          placeholderTextColor={Colors.light.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="input-profile-email"
        />
        <ThemedText style={styles.hint}>
          Links this listing to an existing account. Orphans without a profile are not created.
        </ThemedText>
      </View>

      <View style={styles.formGroup}>
        <ThemedText style={styles.label}>Name *</ThemedText>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Practitioner name"
          placeholderTextColor={Colors.light.textSecondary}
          testID="input-name"
        />
      </View>

      <View style={styles.formGroup}>
        <ThemedText style={styles.label}>Category *</ThemedText>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="e.g., Healings, Counseling..."
          placeholderTextColor={Colors.light.textSecondary}
          testID="input-category"
        />
      </View>

      <View style={styles.formGroup}>
        <ThemedText style={styles.label}>Subcategory</ThemedText>
        <TextInput
          style={styles.input}
          value={subcategory}
          onChangeText={setSubcategory}
          placeholder="e.g., Reiki, Yoga..."
          placeholderTextColor={Colors.light.textSecondary}
          testID="input-subcategory"
        />
      </View>

      <View style={styles.formGroup}>
        <ThemedText style={styles.label}>Bio</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Short bio about the practitioner"
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={3}
          testID="input-bio"
        />
      </View>

      <View style={styles.formGroup}>
        <ThemedText style={styles.label}>Experience</ThemedText>
        <TextInput
          style={styles.input}
          value={experience}
          onChangeText={setExperience}
          placeholder="e.g., 5 years"
          placeholderTextColor={Colors.light.textSecondary}
          testID="input-experience"
        />
      </View>

      <View style={styles.formGroup}>
        <ThemedText style={styles.label}>Certifications</ThemedText>
        <TextInput
          style={styles.input}
          value={certifications}
          onChangeText={setCertifications}
          placeholder="Comma separated"
          placeholderTextColor={Colors.light.textSecondary}
          testID="input-certifications"
        />
      </View>

      <View style={styles.formGroup}>
        <ThemedText style={styles.label}>Price per session</ThemedText>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="e.g., 1500"
          placeholderTextColor={Colors.light.textSecondary}
          keyboardType="numeric"
          testID="input-price"
        />
      </View>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {saved ? (
        <View style={styles.confirmationBanner}>
          <Feather name="check-circle" size={18} color="#013220" />
          <ThemedText style={styles.confirmationText}>Practitioner added successfully</ThemedText>
        </View>
      ) : null}

      <Pressable
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={() => void handleSave()}
        disabled={saving}
        testID="button-save-practitioner"
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.saveButtonText}>Save Practitioner</ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorText: {
    color: "#D4534A",
    marginBottom: Spacing.md,
    fontSize: 14,
  },
  confirmationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E0",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  confirmationText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#013220",
  },
  saveButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
