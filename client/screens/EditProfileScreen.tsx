import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout, Card } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/services/profileService";
import { parseProfilePreferences } from "@/types/profilePreferences";
import { computeProfileCompletion } from "@/hooks/useProfileCompletion";
import { uploadProfileAvatar, type LocalFile } from "@/lib/storageUpload";

function profileBio(preferences: Record<string, unknown> | undefined): string {
  return typeof preferences?.bio === "string" ? preferences.bio : "";
}

export default function EditProfileScreen() {
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
    <PageLayout title="Edit Profile" titleInHeader header="back">
      {completion.percent < 100 ? (
        <Card style={styles.completionCard}>
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
        </Card>
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
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  completionCard: {
    marginTop: LayoutSpacing.md,
    marginBottom: LayoutSpacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  completionTitle: { fontSize: 18, fontWeight: "700", color: Colors.light.accent },
  completionSubtitle: { fontSize: 13, color: Colors.light.textMuted, marginTop: LayoutSpacing.sm },
  completionItem: { fontSize: 14, color: Colors.light.text, marginTop: LayoutSpacing.xs },
  avatarContainer: {
    alignItems: "center",
    marginVertical: LayoutSpacing.xl,
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
    marginTop: LayoutSpacing.sm,
  },
  avatarHint: {
    marginTop: LayoutSpacing.sm,
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  fieldGroup: {
    marginBottom: LayoutSpacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginBottom: LayoutSpacing.sm,
    marginLeft: LayoutSpacing.xs,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: LayoutSpacing.md,
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
    marginBottom: LayoutSpacing.md,
  },
  confirmationText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
    textAlign: "center",
    marginBottom: LayoutSpacing.md,
  },
  saveButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: LayoutSpacing.md,
    alignItems: "center",
    marginTop: LayoutSpacing.md,
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
