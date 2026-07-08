import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { getScrollBottomPadding } from "@/lib/layoutInsets";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import BelowHeaderTitle from "@/components/layout/BelowHeaderTitle";
import {
  completePractitionerOnboarding,
  fetchPractitionerOnboardingState,
} from "@/services/content/practitionerOnboardingService";

export default function PractitionerOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!isSupabaseConfigured() || !session?.user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const res = await fetchPractitionerOnboardingState(session.user.id);
    setLoading(false);
    if (!res.ok) {
      setLoadError(res.error);
      return;
    }
    setName(res.state.name);
    setBio(res.state.bio);
    setPrice(res.state.pricePerSession > 0 ? String(res.state.pricePerSession) : "");
    setMeetingLink(res.state.meetingLink);
  }, [session?.user?.id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleComplete = async () => {
    if (!session?.user?.id || saving) return;
    if (!name.trim() || !bio.trim()) {
      setSaveError("Please add your display name and a short bio.");
      return;
    }
    const priceNum = Number(price.replace(/[^\d.]/g, ""));
    if (!priceNum || priceNum <= 0) {
      setSaveError("Enter a valid session price in INR.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const res = await completePractitionerOnboarding(session.user.id, {
      name: name.trim(),
      bio: bio.trim(),
      pricePerSession: priceNum,
      meetingLink: meetingLink.trim(),
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error);
      return;
    }
    await refreshProfile();
    navigation.reset({ index: 0, routes: [{ name: "PractitionerMain" }] });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: getScrollBottomPadding(insets.bottom, 24) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Feather name="heart" size={32} color={Colors.light.accent} />
          </View>
          <BelowHeaderTitle style={styles.heroTitleWrap}>
            Welcome to your practitioner dashboard
          </BelowHeaderTitle>
          <ThemedText style={styles.subtitle}>
            Your application was approved. Complete your public profile so clients can book
            sessions with you.
          </ThemedText>
        </View>

        {loadError ? (
          <Pressable onPress={() => void loadProfile()}>
            <ThemedText style={styles.errorText}>{loadError} — tap to retry</ThemedText>
          </Pressable>
        ) : null}

        <View style={styles.card}>
          <ThemedText style={styles.label}>Display name</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="How clients will see you"
            placeholderTextColor={Colors.light.textMuted}
          />

          <ThemedText style={styles.label}>Bio</ThemedText>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={bio}
            onChangeText={setBio}
            placeholder="Your approach, experience, and what clients can expect"
            placeholderTextColor={Colors.light.textMuted}
            multiline
          />

          <ThemedText style={styles.label}>Session price (INR)</ThemedText>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="1500"
            placeholderTextColor={Colors.light.textMuted}
            keyboardType="numeric"
          />

          <ThemedText style={styles.label}>Meeting link (optional)</ThemedText>
          <TextInput
            style={styles.input}
            value={meetingLink}
            onChangeText={setMeetingLink}
            placeholder="https://meet.google.com/..."
            placeholderTextColor={Colors.light.textMuted}
            autoCapitalize="none"
          />
        </View>

        {saveError ? <ThemedText style={styles.errorText}>{saveError}</ThemedText> : null}

        <Pressable
          style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
          onPress={() => void handleComplete()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.primaryBtnText}>Continue to practitioner dashboard</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundRoot },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundRoot,
  },
  scroll: { padding: Spacing.lg },
  hero: { alignItems: "center", marginBottom: Spacing.xl },
  heroTitleWrap: { marginBottom: Spacing.sm },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.divider,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundRoot,
  },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  primaryBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    minHeight: 48,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Nunito_700Bold" },
  errorText: {
    color: "#8B3A3A",
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
});
