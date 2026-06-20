import React, { useCallback, useState } from "react";
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
import {
  fetchSellerStorefrontByProfileId,
  updateSellerStorefrontByProfileId,
} from "@/services/commerce/sellerStorefrontService";

export default function SellerOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session, refreshProfile } = useAuth();
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [philosophy, setPhilosophy] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadStorefront = useCallback(async () => {
    if (!isSupabaseConfigured() || !session?.user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const res = await fetchSellerStorefrontByProfileId(session.user.id);
    setLoading(false);
    if (!res.ok) {
      setLoadError(res.error);
      return;
    }
    setStoreName(res.storefront.storeName);
    setDescription(res.storefront.description);
    setPhilosophy(res.storefront.philosophy);
  }, [session?.user?.id]);

  React.useEffect(() => {
    void loadStorefront();
  }, [loadStorefront]);

  const handleComplete = async () => {
    if (!session?.user?.id || saving) return;
    if (!storeName.trim()) {
      setSaveError("Please enter your store name.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const res = await updateSellerStorefrontByProfileId(session.user.id, {
      storeName: storeName.trim(),
      description: description.trim(),
      philosophy: philosophy.trim(),
      settings: {
        accent_color: "#013220",
        banner_theme_index: 0,
        featured_product_ids: [],
        onboarding_complete: true,
      },
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error);
      return;
    }
    await refreshProfile();
    navigation.reset({ index: 0, routes: [{ name: "SellerMain" }] });
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
            <Feather name="check-circle" size={32} color={Colors.light.accent} />
          </View>
          <ThemedText style={styles.title}>Welcome to your seller dashboard</ThemedText>
          <ThemedText style={styles.subtitle}>
            Your application was approved. Set up your storefront so customers can discover your
            products.
          </ThemedText>
        </View>

        {loadError ? (
          <Pressable onPress={() => void loadStorefront()}>
            <ThemedText style={styles.errorText}>{loadError} — tap to retry</ThemedText>
          </Pressable>
        ) : null}

        <View style={styles.card}>
          <ThemedText style={styles.label}>Store name</ThemedText>
          <TextInput
            style={styles.input}
            value={storeName}
            onChangeText={setStoreName}
            placeholder="Your brand or shop name"
            placeholderTextColor={Colors.light.textMuted}
          />

          <ThemedText style={styles.label}>About your products</ThemedText>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What do you sell? What makes your shop special?"
            placeholderTextColor={Colors.light.textMuted}
            multiline
          />

          <ThemedText style={styles.label}>Wellness philosophy (optional)</ThemedText>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={philosophy}
            onChangeText={setPhilosophy}
            placeholder="A short note on your approach to wellness"
            placeholderTextColor={Colors.light.textMuted}
            multiline
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
            <ThemedText style={styles.primaryBtnText}>Continue to seller dashboard</ThemedText>
          )}
        </Pressable>

        <ThemedText style={styles.footerHint}>
          You can add products, customize your store further, and manage orders from the seller
          home screen.
        </ThemedText>
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
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
    fontWeight: "600",
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
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundRoot,
  },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  primaryBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  footerHint: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textMuted,
    textAlign: "center",
  },
  errorText: {
    color: "#8B3A3A",
    fontSize: 14,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
});
