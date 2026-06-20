import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import { formatInr } from "@/lib/formatCurrency";
import { uploadPractitionerPhoto, type LocalFile } from "@/lib/storageUpload";
import { useAuth } from "@/context/AuthContext";
import { useDataContext } from "@/context/DataContext";
import { usePractitionerContext } from "@/context/PractitionerContext";
import {
  fetchPractitionerProfileDetails,
  updatePractitionerProfileDetails,
} from "@/services/content/practitionerId";

function parsePriceFromLabel(label: string): number {
  const match = label.match(/(\d[\d,]*)/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

function formatPriceLabel(amount: number): string {
  if (!amount) return `${formatInr(0)} per session`;
  return `${formatInr(amount)} per session`;
}

export default function PractitionerProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { profile, session } = useAuth();
  const { refresh } = usePractitionerContext();
  const { refreshContent } = useDataContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [practitionerName, setPractitionerName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [certifications, setCertifications] = useState("");
  const [pricing, setPricing] = useState("");
  const [available, setAvailable] = useState(true);
  const [meetingLink, setMeetingLink] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      const details = await fetchPractitionerProfileDetails(profile?.id);
      if (cancelled) return;
      if (!details) {
        setLoadError("Could not load your practitioner profile.");
        setLoading(false);
        return;
      }
      setPractitionerName(details.name);
      setSpecialty(details.subcategory || details.category);
      setBio(details.bio);
      setExperience(details.experience);
      setCertifications(details.certifications.join(", "));
      setPricing(formatPriceLabel(details.pricePerSession));
      setAvailable(details.isActive);
      setMeetingLink(details.meetingLink);
      setPhotoUrl(details.photoUrl);
      setPhotoPreviewUri(details.photoUrl || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const handlePickPhoto = async () => {
    if (uploadingPhoto || !session?.user?.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to update your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const file: LocalFile = {
      uri: asset.uri,
      name: asset.fileName ?? `practitioner-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
    };

    setUploadingPhoto(true);
    setSaveError("");
    setPhotoPreviewUri(asset.uri);

    const uploaded = await uploadPractitionerPhoto(session.user.id, file);
    if (uploaded.error || !uploaded.url) {
      setPhotoPreviewUri(photoUrl || null);
      setSaveError(uploaded.error ?? "Photo upload failed.");
      setUploadingPhoto(false);
      return;
    }

    const resultUpdate = await updatePractitionerProfileDetails(profile?.id, {
      photoUrl: uploaded.url,
    });
    setUploadingPhoto(false);

    if (resultUpdate.error) {
      setSaveError(resultUpdate.error);
      setPhotoPreviewUri(photoUrl || null);
      return;
    }

    setPhotoUrl(uploaded.url);
    await Promise.all([refresh(), refreshContent({ silent: true })]);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    const result = await updatePractitionerProfileDetails(profile?.id, {
      name: practitionerName.trim() || profile?.full_name || "Practitioner",
      bio: bio.trim(),
      experience: experience.trim(),
      certifications: certifications
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      pricePerSession: parsePriceFromLabel(pricing),
      isActive: available,
      meetingLink: meetingLink.trim(),
    });
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    await Promise.all([refresh(), refreshContent({ silent: true })]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.light.accent} />
      </View>
    );
  }

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 30) }]}
        showsVerticalScrollIndicator={false}
      >
        {loadError ? <ThemedText style={styles.errorText}>{loadError}</ThemedText> : null}

        <Pressable
          style={styles.photoSection}
          onPress={() => void handlePickPhoto()}
          disabled={uploadingPhoto}
          testID="button-change-photo"
        >
          {photoPreviewUri ? (
            <Image source={{ uri: photoPreviewUri }} style={styles.profilePhoto} resizeMode="cover" />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Feather name="user" size={40} color={Colors.light.accent} />
            </View>
          )}
          {uploadingPhoto ? (
            <ActivityIndicator color={Colors.light.accent} style={styles.photoSpinner} />
          ) : null}
          <ThemedText style={styles.photoLabel}>Tap to change photo</ThemedText>
        </Pressable>

        <View style={styles.nameCard}>
          <ThemedText style={styles.practitionerName}>{practitionerName || profile?.full_name}</ThemedText>
          <ThemedText style={styles.practitionerSpecialty}>{specialty || "Practitioner"}</ThemedText>
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

        <ThemedText style={styles.fieldLabel}>Session meeting link</ThemedText>
        <TextInput
          style={styles.input}
          value={meetingLink}
          onChangeText={setMeetingLink}
          placeholder="https://zoom.us/j/... or Google Meet link"
          placeholderTextColor={Colors.light.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          testID="input-meeting-link"
        />
        <ThemedText style={styles.availabilityHint}>
          Clients can join upcoming sessions from this link. Update it before each session if needed.
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

        {saveError ? <ThemedText style={styles.errorText}>{saveError}</ThemedText> : null}

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={() => void handleSave()}
          disabled={saving}
          testID="button-save-profile"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.saveButtonText}>Save Profile</ThemedText>
          )}
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: Spacing.lg,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.sm,
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  photoSpinner: {
    marginBottom: Spacing.sm,
  },
  photoLabel: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  nameCard: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  practitionerName: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 4,
  },
  practitionerSpecialty: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    marginBottom: Spacing.lg,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  availabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  toggleOn: {
    backgroundColor: Colors.light.accent,
    alignItems: "flex-end",
  },
  toggleOff: {
    backgroundColor: Colors.light.backgroundTertiary,
    alignItems: "flex-start",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  thumbOn: {},
  thumbOff: {},
  availabilityHint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: Spacing.xl,
  },
  sessionSetupSection: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
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
    gap: Spacing.sm,
  },
  sessionSetupButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  saveButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: Spacing.md,
    minHeight: 52,
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  confirmationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(1, 50, 32, 0.1)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  confirmationText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#013220",
  },
  errorText: {
    fontSize: 14,
    color: "#C0392B",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
});
