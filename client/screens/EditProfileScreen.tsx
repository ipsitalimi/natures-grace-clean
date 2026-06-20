import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/services/profileService";
import { parseProfilePreferences } from "@/types/profilePreferences";
import { computeProfileCompletion } from "@/hooks/useProfileCompletion";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import { uploadProfileAvatar, type LocalFile } from "@/lib/storageUpload";

function profileBio(preferences: Record<string, unknown> | undefined): string {
  return typeof preferences?.bio === "string" ? preferences.bio : "";
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { profile, refreshProfile, isConfigured } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setEmail(profile.email);
    setPhone(profile.phone || "");
    setBio(profileBio(profile.preferences));
    setAvatarPreview(profile.avatar_url || null);
  }, [profile]);

  const completion = computeProfileCompletion(profile, profile?.role ?? "User", null);

  const handlePickAvatar = async () => {
    if (uploadingAvatar || !profile) return;
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
      name: asset.fileName ?? `avatar-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
    };

    setUploadingAvatar(true);
    setError("");
    setAvatarPreview(asset.uri);

    const uploaded = await uploadProfileAvatar(profile.id, file);
    if (uploaded.error || !uploaded.url) {
      setAvatarPreview(profile.avatar_url || null);
      setError(uploaded.error ?? "Photo upload failed.");
      setUploadingAvatar(false);
      return;
    }

    const resultUpdate = await updateProfile(profile.id, { avatar_url: uploaded.url });
    setUploadingAvatar(false);

    if (resultUpdate.error) {
      setError(resultUpdate.error);
      setAvatarPreview(profile.avatar_url || null);
      return;
    }

    setAvatarPreview(uploaded.url);
    await refreshProfile();
  };

  const handleSave = async () => {
    setError("");
    if (!isConfigured || !profile) {
      setError("Sign in to save profile changes.");
      return;
    }
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setSaving(true);
    const prefs = {
      ...parseProfilePreferences(profile.preferences),
      bio: bio.trim(),
    };
    const result = await updateProfile(profile.id, {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      preferences: prefs,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await refreshProfile();
    setConfirmation(true);
    setTimeout(() => setConfirmation(false), 2500);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Edit Profile</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 24) }]}
        showsVerticalScrollIndicator={false}
      >
        {completion.percent < 100 ? (
          <View style={styles.completionCard}>
            <ThemedText style={styles.completionTitle}>{completion.percent}% Complete</ThemedText>
            {completion.missing.length > 0 ? (
              <>
                <ThemedText style={styles.completionSubtitle}>Missing:</ThemedText>
                {completion.missing.map((item) => (
                  <ThemedText key={item.key} style={styles.completionItem}>
                    · {item.label}
                  </ThemedText>
                ))}
              </>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={styles.avatarContainer}
          onPress={() => void handlePickAvatar()}
          disabled={uploadingAvatar}
          testID="button-change-avatar"
        >
          {avatarPreview ? (
            <Image source={{ uri: avatarPreview }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <View style={styles.avatar}>
              <Feather name="user" size={40} color={Colors.light.accent} />
            </View>
          )}
          {uploadingAvatar ? (
            <ActivityIndicator color={Colors.light.accent} style={styles.avatarSpinner} />
          ) : (
            <ThemedText style={styles.avatarHint}>Tap to change photo</ThemedText>
          )}
        </Pressable>

        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Full Name</ThemedText>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor={Colors.light.textSecondary}
            testID="input-fullname"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Email</ThemedText>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={email}
            editable={false}
            placeholder="Enter your email"
            placeholderTextColor={Colors.light.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="input-email"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Phone</ThemedText>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            placeholderTextColor={Colors.light.textSecondary}
            keyboardType="phone-pad"
            testID="input-phone"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Bio</ThemedText>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            placeholderTextColor={Colors.light.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            testID="input-bio"
          />
        </View>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        {confirmation ? (
          <ThemedText style={styles.confirmationText} testID="text-profile-updated">Profile Updated</ThemedText>
        ) : null}

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={() => void handleSave()}
          disabled={saving}
          testID="button-save-profile"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
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
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 8,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerIconButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  completionCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  completionTitle: { fontSize: 18, fontWeight: "700", color: Colors.light.accent },
  completionSubtitle: { fontSize: 13, color: Colors.light.textMuted, marginTop: 8 },
  completionItem: { fontSize: 14, color: Colors.light.text, marginTop: 4 },
  avatarContainer: {
    alignItems: "center",
    marginVertical: Spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.light.accent}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarSpinner: {
    marginTop: Spacing.sm,
  },
  avatarHint: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.light.text,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 14,
  },
  errorText: {
    fontSize: 14,
    color: "#C0392B",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  confirmationText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.md,
    minHeight: 52,
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
