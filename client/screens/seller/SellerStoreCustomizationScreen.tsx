import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { sellerProducts } from "@/data/sellerMockData";

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

export default function SellerStoreCustomizationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [storeName, setStoreName] = useState("Priya's Wellness Store");
  const [bio, setBio] = useState(
    "Curating sacred wellness products rooted in Ayurvedic wisdom and conscious living. Every item is chosen with intention."
  );
  const [philosophy, setPhilosophy] = useState(
    "We believe that true wellness begins with mindful choices. Our store brings you products that honour nature and nourish the soul."
  );
  const [selectedColor, setSelectedColor] = useState(ACCENT_COLORS[0].value);
  const [selectedBanner, setSelectedBanner] = useState(0);
  const [featuredIds, setFeaturedIds] = useState<string[]>(["sel-1", "sel-3", "sel-5"]);
  const [saved, setSaved] = useState(false);

  const toggleFeatured = (id: string) => {
    setFeaturedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const previewBanner = BANNER_THEMES[selectedBanner];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Store Customization</ThemedText>
        <Pressable style={styles.saveHeaderBtn} onPress={handleSave} testID="button-save-header">
          <ThemedText style={styles.saveHeaderText}>Save</ThemedText>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <View style={[styles.previewBanner, { backgroundColor: previewBanner.bg }]}>
          <View style={[styles.previewAvatar, { borderColor: previewBanner.accent }]}>
            <Feather name="shopping-bag" size={24} color={previewBanner.accent} />
          </View>
          <ThemedText style={[styles.previewStoreName, { color: previewBanner.accent }]}>
            {storeName}
          </ThemedText>
          <ThemedText style={styles.previewBio} numberOfLines={2}>
            {bio}
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
            testID="input-philosophy"
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Featured Products</ThemedText>
          <ThemedText style={styles.sectionSub}>
            Select up to 4 products to highlight on your store page
          </ThemedText>
          {sellerProducts.map((product) => {
            const isFeatured = featuredIds.includes(product.id);
            return (
              <Pressable
                key={product.id}
                style={[styles.productRow, isFeatured && styles.productRowActive]}
                onPress={() => toggleFeatured(product.id)}
                testID={`product-feature-${product.id}`}
              >
                <View style={styles.productCheckbox}>
                  {isFeatured ? (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  ) : null}
                </View>
                <View style={styles.productRowInfo}>
                  <ThemedText style={styles.productRowName}>{product.name}</ThemedText>
                  <ThemedText style={styles.productRowPrice}>Rs. {product.price.toLocaleString()}</ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>

        {saved ? (
          <View style={styles.savedBanner}>
            <Feather name="check-circle" size={16} color="#013220" />
            <ThemedText style={styles.savedText}>Store customization saved</ThemedText>
          </View>
        ) : null}

        <Pressable style={styles.saveBtn} onPress={handleSave} testID="button-save">
          <ThemedText style={styles.saveBtnText}>Save Changes</ThemedText>
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
  },
  saveHeaderText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
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
    boxShadow: "0px 0px 0px 2px rgba(0,0,0,0.3)",
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
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
