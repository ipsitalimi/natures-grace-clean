import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import neelamPhoto from "../../../assets/images/neelam.jpg";

export default function PractitionerProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [bio, setBio] = useState(
    "Certified Reiki Master and energy healer with a passion for holistic wellness. Specializing in chakra alignment and spiritual counseling."
  );
  const [experience, setExperience] = useState("8 years");
  const [certifications, setCertifications] = useState(
    "Reiki Master Level 3, Certified Pranic Healer, Spiritual Counseling Diploma"
  );
  const [pricing, setPricing] = useState("Rs. 1,200 - Rs. 2,500 per session");
  const [available, setAvailable] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={20} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>My Profile</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.photoSection}>
          <Image source={neelamPhoto} style={styles.profilePhoto} resizeMode="cover" />
          <ThemedText style={styles.photoLabel}>Tap to change photo</ThemedText>
        </View>

        <View style={styles.nameCard}>
          <ThemedText style={styles.practitionerName}>Dr. Neelam Parwani</ThemedText>
          <ThemedText style={styles.practitionerSpecialty}>Reiki Grand Master & Energy Healer</ThemedText>
        </View>

        <ThemedText style={styles.fieldLabel}>Bio</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          placeholderTextColor={Colors.light.textMuted}
          testID="input-bio"
        />

        <ThemedText style={styles.fieldLabel}>Experience</ThemedText>
        <TextInput
          style={styles.input}
          value={experience}
          onChangeText={setExperience}
          placeholderTextColor={Colors.light.textMuted}
          testID="input-experience"
        />

        <ThemedText style={styles.fieldLabel}>Certifications</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={certifications}
          onChangeText={setCertifications}
          multiline
          numberOfLines={3}
          placeholderTextColor={Colors.light.textMuted}
          testID="input-certifications"
        />

        <ThemedText style={styles.fieldLabel}>Pricing</ThemedText>
        <TextInput
          style={styles.input}
          value={pricing}
          onChangeText={setPricing}
          placeholderTextColor={Colors.light.textMuted}
          testID="input-pricing"
        />

        <View style={styles.availabilityRow}>
          <ThemedText style={styles.fieldLabel}>Availability</ThemedText>
          <Pressable
            style={[styles.toggle, available ? styles.toggleOn : styles.toggleOff]}
            onPress={() => setAvailable(!available)}
            testID="toggle-availability"
          >
            <View style={[styles.toggleThumb, available ? styles.thumbOn : styles.thumbOff]} />
          </Pressable>
        </View>
        <ThemedText style={styles.availabilityHint}>
          {available ? "You are currently accepting new clients" : "You are not accepting new clients"}
        </ThemedText>

        <View style={styles.sessionSetupSection}>
          <ThemedText style={styles.sessionSetupTitle}>Session Setup</ThemedText>
          <ThemedText style={styles.sessionSetupHint}>
            Configure the sessions users can book with you.
          </ThemedText>
          <Pressable
            style={styles.sessionSetupButton}
            onPress={() => (navigation as any).navigate("SessionOfferings")}
            testID="button-session-offerings"
          >
            <Feather name="settings" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.sessionSetupButtonText}>Session Offerings</ThemedText>
            <Feather name="chevron-right" size={18} color={Colors.light.accent} />
          </Pressable>
        </View>

        <Pressable style={styles.saveButton} onPress={handleSave} testID="button-save-profile">
          <ThemedText style={styles.saveButtonText}>Save Profile</ThemedText>
        </Pressable>

        {saved ? (
          <View style={styles.confirmationBanner}>
            <Feather name="check-circle" size={16} color="#013220" />
            <ThemedText style={styles.confirmationText}>Profile updated successfully</ThemedText>
          </View>
        ) : null}
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
    paddingVertical: Spacing.md,
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
  headerTitle: {
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
  photoSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  photoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: Spacing.sm,
  },
  photoLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  nameCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  practitionerName: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  practitionerSpecialty: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  fieldLabel: {
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
    minHeight: 80,
    textAlignVertical: "top",
  },
  availabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  toggle: {
    width: 48,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: "#013220",
  },
  toggleOff: {
    backgroundColor: "#AAB494",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  thumbOn: {
    alignSelf: "flex-end",
  },
  thumbOff: {
    alignSelf: "flex-start",
  },
  availabilityHint: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: Spacing.xs,
  },
  sessionSetupSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  sessionSetupTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 4,
  },
  sessionSetupHint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: Spacing.md,
  },
  sessionSetupButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  sessionSetupButtonText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  saveButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  confirmationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(1, 50, 32, 0.1)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  confirmationText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#013220",
  },
});
