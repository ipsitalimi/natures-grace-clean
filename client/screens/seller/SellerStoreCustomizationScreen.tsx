import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";
import { formatInr } from "@/lib/formatCurrency";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import {
  fetchSellerStorefrontByProfileId,
  updateSellerStorefrontByProfileId,
  type StorefrontSettings,
} from "@/services/commerce/sellerStorefrontService";

const ACCENT_COLORS = [
  { label: "Forest", value: "#013220" },
  { label: "Sage", value: "#4A7C59" },
  { label: "Earth", value: "#8B6F47" },
  { label: "Rose", value: "#C07A8A" },
  { label: "Sky", value: "#4A8FA8" },
  { label: "Lavender", value: "#6B6BA8" },
];

const BANNER_THEMES = [
  { label: "Olive Calm", bg: "#E8EDDF", accent: "#013220" },
  { label: "Warm Earth", bg: "#EDE3D5", accent: "#8B6F47" },
  { label: "Sage Mist", bg: "#D8E5D5", accent: "#4A7C59" },
  { label: "Rose Dusk", bg: "#F0E0E4", accent: "#C07A8A" },
];

const EMPTY_SETTINGS: StorefrontSettings = {
  accent_color: ACCENT_COLORS[0].value,
  banner_theme_index: 0,
  featured_product_ids: [],
};

export default function SellerStoreCustomizationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { session } = useAuth();
  const { sellerCatalog: sellerProducts } = useDataContext();

  const [storeName, setStoreName] = useState("");
  const [bio, setBio] = useState("");
  const [philosophy, setPhilosophy] = useState("");
  const [selectedColor, setSelectedColor] = useState(EMPTY_SETTINGS.accent_color);
  const [selectedBanner, setSelectedBanner] = useState(0);
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const applyStorefront = useCallback(
    (storeNameVal: string, description: string, philosophyVal: string, settings: StorefrontSettings) => {
      setStoreName(storeNameVal);
      setBio(description);
      setPhilosophy(philosophyVal);
      setSelectedColor(settings.accent_color);
      setSelectedBanner(settings.banner_theme_index);
      setFeaturedIds(settings.featured_product_ids);
    },
    []
  );

  const loadStorefront = useCallback(async () => {
    if (!isSupabaseConfigured() || !session?.user?.id) {
      setLoading(false);
      setLoadError(null);
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
    applyStorefront(
      res.storefront.storeName,
      res.storefront.description,
      res.storefront.philosophy,
      res.storefront.settings
    );
  }, [session?.user?.id, applyStorefront]);

  useFocusEffect(
    useCallback(() => {
      void loadStorefront();
    }, [loadStorefront])
  );

  const toggleFeatured = (id: string) => {
    setFeaturedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleSave = async () => {
    if (!isSupabaseConfigured() || !session?.user?.id) {
      setSaveError("Connect Supabase and sign in as a seller to save.");
      return;
    }
    if (!storeName.trim()) {
      setSaveError("Store name is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const res = await updateSellerStorefrontByProfileId(session.user.id, {
      storeName,
      description: bio,
      philosophy,
      settings: {
        accent_color: selectedColor,
        banner_theme_index: selectedBanner,
        featured_product_ids: featuredIds,
      },
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error);
      return;
    }
    applyStorefront(
      res.storefront.storeName,
      res.storefront.description,
      res.storefront.philosophy,
      res.storefront.settings
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const previewBanner = BANNER_THEMES[selectedBanner] ?? BANNER_THEMES[0];
  const inputsDisabled = saving || loading;

  return (
    <View style={[styles.container, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Store Customization</ThemedText>
        <Pressable
          style={styles.saveHeaderBtn}
          onPress={() => void handleSave()}
          disabled={saving || loading}
          testID="button-save-header"
        >
          {saving ? (
            <ActivityIndicator color={Colors.light.accent} size="small" />
          ) : (
            <ThemedText style={styles.saveHeaderText}>Save</ThemedText>
          )}
        </Pressable>
      </View>

      {!isSupabaseConfigured() ? (
        <ThemedText style={styles.hint}>Connect Supabase to save store customization.</ThemedText>
      ) : null}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.hint}>Loading your store…</ThemedText>
        </View>
      ) : null}

      {loadError ? (
        <Pressable onPress={() => void loadStorefront()} style={styles.hintWrap} testID="button-storefront-load-retry">
          <ThemedText style={styles.errorText}>{loadError} — tap to retry</ThemedText>
        </Pressable>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: getScrollBottomPadding(insets.bottom, 24) }]}
      >
        <View style={[styles.previewBanner, { backgroundColor: previewBanner.bg }]}>
          <View style={[styles.previewAvatar, { borderColor: previewBanner.accent }]}>
            <Feather name="shopping-bag" size={24} color={previewBanner.accent} />
          </View>
          <ThemedText style={[styles.previewStoreName, { color: previewBanner.accent }]}>
            {storeName.trim() || "—"}
          </ThemedText>
          <ThemedText style={styles.previewBio} numberOfLines={2}>
            {bio.trim() || "—"}
          </ThemedText>
          <View style={styles.previewBadge}>
            <ThemedText style={styles.previewBadgeText}>Live Preview</ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Store Name</ThemedText>
          <TextInput
            style={styles.textInput}
            value={storeName}
            onChangeText={setStoreName}
            placeholder="Your store name"
            placeholderTextColor={Colors.light.textMuted}
            editable={!inputsDisabled}
            testID="input-store-name"
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Store Bio</ThemedText>
          <TextInput
            style={styles.multilineInput}
            value={bio}
            onChangeText={setBio}
            placeholder="Describe your store..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
            numberOfLines={3}
            editable={!inputsDisabled}
            testID="input-bio"
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Store Banner Theme</ThemedText>
          <ThemedText style={styles.sectionSub}>Choose a colour palette for your store header</ThemedText>
          <View style={styles.bannerThemesRow}>
            {BANNER_THEMES.map((theme, idx) => (
              <Pressable
                key={idx}
                style={[
                  styles.bannerThemeChip,
                  { backgroundColor: theme.bg, borderColor: theme.accent },
                  selectedBanner === idx && styles.bannerThemeChipActive,
                ]}
                onPress={() => setSelectedBanner(idx)}
                disabled={inputsDisabled}
                testID={`banner-theme-${idx}`}
              >
                <ThemedText style={[styles.bannerThemeLabel, { color: theme.accent }]}>
                  {theme.label}
                </ThemedText>
                {selectedBanner === idx ? (
                  <Feather name="check" size={12} color={theme.accent} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Accent Colour</ThemedText>
          <ThemedText style={styles.sectionSub}>Used for buttons and highlights</ThemedText>
          <View style={styles.colorRow}>
            {ACCENT_COLORS.map((c) => (
              <Pressable
                key={c.value}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c.value },
                  selectedColor === c.value && styles.colorSwatchActive,
                ]}
                onPress={() => setSelectedColor(c.value)}
                disabled={inputsDisabled}
                testID={`color-${c.label.toLowerCase()}`}
              >
                {selectedColor === c.value ? (
                  <Feather name="check" size={14} color="#FFFFFF" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Wellness Philosophy</ThemedText>
          <ThemedText style={styles.sectionSub}>This appears on your About section</ThemedText>
          <TextInput
            style={styles.multilineInput}
            value={philosophy}
            onChangeText={setPhilosophy}
            placeholder="Your wellness philosophy..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
            numberOfLines={4}
            editable={!inputsDisabled}
            testID="input-philosophy"
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Featured Products</ThemedText>
          <ThemedText style={styles.sectionSub}>
            Select up to 4 products to highlight on your store page
          </ThemedText>
          {sellerProducts.length === 0 ? (
            <ThemedText style={styles.hint}>Add products to your catalog to feature them here.</ThemedText>
          ) : null}
          {sellerProducts.map((product) => {
            const isFeatured = featuredIds.includes(product.id);
            return (
              <Pressable
                key={product.id}
                style={[styles.productRow, isFeatured && styles.productRowActive]}
                onPress={() => toggleFeatured(product.id)}
                disabled={inputsDisabled}
                testID={`product-feature-${product.id}`}
              >
                <View style={[styles.productCheckbox, !isFeatured && styles.productCheckboxEmpty]}>
                  {isFeatured ? (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  ) : null}
                </View>
                <View style={styles.productRowInfo}>
                  <ThemedText style={styles.productRowName}>{product.name}</ThemedText>
                  <ThemedText style={styles.productRowPrice}>{formatInr(product.price)}</ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>

        {saveError ? <ThemedText style={styles.errorText}>{saveError}</ThemedText> : null}

        {saved ? (
          <View style={styles.savedBanner}>
            <Feather name="check-circle" size={16} color="#013220" />
            <ThemedText style={styles.savedText}>Store customization saved</ThemedText>
          </View>
        ) : null}

        <Pressable
          style={[styles.saveBtn, (saving || loading) && styles.saveBtnDisabled]}
          onPress={() => void handleSave()}
          disabled={saving || loading}
          testID="button-save"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.saveBtnText}>Save Changes</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundRoot },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  saveHeaderBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    minWidth: 48,
    alignItems: "center",
  },
  saveHeaderText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  hintWrap: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  hint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#8B3A3A",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  previewBanner: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
    position: "relative",
  },
  previewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  previewStoreName: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
  },
  previewBio: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  previewBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  previewBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "rgba(0,0,0,0.5)",
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: -4,
  },
  textInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: `${Colors.light.divider}40`,
  },
  multilineInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: `${Colors.light.divider}40`,
    minHeight: 80,
    textAlignVertical: "top",
  },
  bannerThemesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  bannerThemeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  bannerThemeChipActive: {
    borderWidth: 2,
  },
  bannerThemeLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
  colorRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  productRowActive: {
    borderColor: Colors.light.accent,
    backgroundColor: `${Colors.light.accent}06`,
  },
  productCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
    backgroundColor: Colors.light.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  productCheckboxEmpty: {
    backgroundColor: "transparent",
  },
  productRowInfo: {
    flex: 1,
  },
  productRowName: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  productRowPrice: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(1,50,32,0.08)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
  },
  savedText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#013220",
  },
  saveBtn: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.xs,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
