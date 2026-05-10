import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";

export default function AdminAddPractitionerScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const { addPractitioner } = useDataContext();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [certifications, setCertifications] = useState("");
  const [price, setPrice] = useState("");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!name.trim() || !category.trim()) return;
    addPractitioner({
      name: name.trim(),
      category: category.trim(),
      bio: bio.trim() || `${name.trim()} is a dedicated wellness practitioner specializing in ${category.trim()}.`,
      experience: experience.trim() || "1+ years",
      certifications: certifications
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      rating: 5.0,
      pricePerSession: parseInt(price, 10) || 1000,
    });
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

      {saved ? (
        <View style={styles.confirmationBanner}>
          <Feather name="check-circle" size={18} color="#013220" />
          <ThemedText style={styles.confirmationText}>Practitioner added successfully</ThemedText>
        </View>
      ) : null}

      <Pressable
        style={styles.saveButton}
        onPress={handleSave}
        testID="button-save-practitioner"
      >
        <ThemedText style={styles.saveButtonText}>Save Practitioner</ThemedText>
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
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
