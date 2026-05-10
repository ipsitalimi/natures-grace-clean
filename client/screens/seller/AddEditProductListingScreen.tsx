import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { productListingsStore, type ProductListing } from "@/data/productListingsStore";
import { SELLER_CATEGORIES } from "@/data/sellerMockData";

const MIN_PRICE = 200;
const MAX_PRICE = 5000;
const PRICE_STEP = 100;

function TagIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.59 13.41L13.42 20.58C13.2343 20.766 13.0137 20.9135 12.7709 21.0141C12.5281 21.1148 12.2678 21.1666 12.005 21.1666C11.7422 21.1666 11.4819 21.1148 11.2391 21.0141C10.9963 20.9135 10.7757 20.766 10.59 20.58L2 12V2H12L20.59 10.59C20.9625 10.9647 21.1716 11.4716 21.1716 12C21.1716 12.5284 20.9625 13.0353 20.59 13.41Z"
        stroke={Colors.light.accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx="7" cy="7" r="1.5" fill={Colors.light.accent} />
    </Svg>
  );
}

function PriceIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={Colors.light.accent} strokeWidth="1.5" fill="none" />
      <Path d="M12 6V18" stroke={Colors.light.accent} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M9 9C9 9 9.5 8 12 8C14.5 8 15 9.5 15 10C15 12 9 12 9 14C9 15 10 16 12 16C14.5 16 15 15 15 15" stroke={Colors.light.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function BoxIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 16V8C20.9996 7.6493 20.9071 7.30483 20.7315 7.00017C20.556 6.69552 20.3037 6.44136 20 6.26L13 2.26C12.696 2.08926 12.3511 2 12 2C11.6489 2 11.304 2.08926 11 2.26L4 6.26C3.69626 6.44136 3.44398 6.69552 3.26846 7.00017C3.09294 7.30483 3.00036 7.6493 3 8V16C3.00036 16.3507 3.09294 16.6952 3.26846 16.9998C3.44398 17.3045 3.69626 17.5586 4 17.74L11 21.74C11.304 21.9107 11.6489 22 12 22C12.3511 22 12.696 21.9107 13 21.74L20 17.74C20.3037 17.5586 20.556 17.3045 20.7315 16.9998C20.9071 16.6952 20.9996 16.3507 21 16Z" stroke={Colors.light.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M3.27 6.96L12 12.01L20.73 6.96" stroke={Colors.light.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 22.08V12" stroke={Colors.light.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function AddEditProductListingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();

  const listingId: string | null = route.params?.listingId ?? null;
  const prefill = route.params?.prefill ?? null;

  const existingListing = listingId
    ? productListingsStore.getListingById(listingId) ?? null
    : null;
  const isEdit = !!existingListing;

  const initial = existingListing || prefill;

  const [name, setName] = useState<string>(initial?.name ?? "");
  const [selectedCategory, setSelectedCategory] = useState<string>(initial?.category ?? "");
  const [price, setPrice] = useState<number>(initial?.price ?? 1000);
  const [stock, setStock] = useState<string>(initial?.stock?.toString() ?? "10");
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [saved, setSaved] = useState(false);

  const canSave = name.trim() !== "" && selectedCategory !== "";

  const handleSave = () => {
    if (!canSave) return;
    const listing: ProductListing = {
      id: existingListing?.id ?? `pl-${Date.now()}`,
      name: name.trim(),
      category: selectedCategory,
      price,
      stock: parseInt(stock, 10) || 0,
      description: description.trim(),
    };
    if (isEdit) {
      productListingsStore.updateListing(listing);
    } else {
      productListingsStore.addListing(listing);
    }
    setSaved(true);
    setTimeout(() => {
      navigation.goBack();
    }, 1200);
  };

  const incrementPrice = () => setPrice((p) => Math.min(p + PRICE_STEP, MAX_PRICE));
  const decrementPrice = () => setPrice((p) => Math.max(p - PRICE_STEP, MIN_PRICE));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={20} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>
          {isEdit ? "Edit Listing" : "Add Product Listing"}
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="edit-3" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.sectionTitle}>Product Name</ThemedText>
          </View>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Enter product name"
            placeholderTextColor={Colors.light.textMuted}
            testID="input-product-name"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TagIcon />
            <ThemedText style={styles.sectionTitle}>Category</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            Choose a category for this product
          </ThemedText>
          <View style={styles.chipsGrid}>
            {SELLER_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.chip,
                  selectedCategory === cat ? styles.chipSelected : null,
                ]}
                onPress={() => setSelectedCategory(cat)}
                testID={`chip-category-${cat.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    selectedCategory === cat ? styles.chipTextSelected : null,
                  ]}
                >
                  {cat}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PriceIcon />
            <ThemedText style={styles.sectionTitle}>Price</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            Set the product price (&#8377;200 - &#8377;5,000)
          </ThemedText>
          <View style={styles.priceCard}>
            <Pressable
              style={[styles.stepperBtn, price <= MIN_PRICE ? styles.stepperBtnDisabled : null]}
              onPress={decrementPrice}
              disabled={price <= MIN_PRICE}
              testID="button-price-minus"
            >
              <Feather name="minus" size={20} color={price <= MIN_PRICE ? Colors.light.textMuted : Colors.light.accent} />
            </Pressable>
            <View style={styles.priceDisplay}>
              <ThemedText style={styles.priceSymbol}>&#8377;</ThemedText>
              <ThemedText style={styles.priceValue}>{price.toLocaleString()}</ThemedText>
            </View>
            <Pressable
              style={[styles.stepperBtn, price >= MAX_PRICE ? styles.stepperBtnDisabled : null]}
              onPress={incrementPrice}
              disabled={price >= MAX_PRICE}
              testID="button-price-plus"
            >
              <Feather name="plus" size={20} color={price >= MAX_PRICE ? Colors.light.textMuted : Colors.light.accent} />
            </Pressable>
          </View>
          <View style={styles.priceRange}>
            <ThemedText style={styles.priceRangeText}>&#8377;200</ThemedText>
            <View style={styles.priceFill}>
              <View
                style={[
                  styles.priceBar,
                  { width: `${((price - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}%` },
                ]}
              />
            </View>
            <ThemedText style={styles.priceRangeText}>&#8377;5,000</ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BoxIcon />
            <ThemedText style={styles.sectionTitle}>Stock Count</ThemedText>
          </View>
          <TextInput
            style={styles.textInput}
            value={stock}
            onChangeText={setStock}
            placeholder="Number of items in stock"
            placeholderTextColor={Colors.light.textMuted}
            keyboardType="number-pad"
            testID="input-stock"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="file-text" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.sectionTitle}>Description</ThemedText>
          </View>
          <TextInput
            style={styles.notesInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe this product..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
            numberOfLines={3}
            testID="input-description"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="image" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.sectionTitle}>Product Image</ThemedText>
          </View>
          <Pressable style={styles.imageUploader} testID="button-upload-image">
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
              <Rect x="3" y="3" width="18" height="18" rx="3" stroke={Colors.light.textMuted} strokeWidth="1.5" />
              <Path d="M12 8V16M8 12H16" stroke={Colors.light.textMuted} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
            <ThemedText style={styles.uploaderText}>Tap to upload image</ThemedText>
          </Pressable>
        </View>

        {canSave ? (
          <View style={styles.previewCard}>
            <ThemedText style={styles.previewLabel}>Preview</ThemedText>
            <ThemedText style={styles.previewName}>{name}</ThemedText>
            <ThemedText style={styles.previewCategory}>{selectedCategory}</ThemedText>
            <ThemedText style={styles.previewPrice}>&#8377;{price.toLocaleString()}</ThemedText>
            <ThemedText style={styles.previewStock}>{stock || "0"} in stock</ThemedText>
          </View>
        ) : null}

        <Pressable
          style={[styles.saveButton, !canSave ? styles.saveButtonDisabled : null]}
          onPress={canSave ? handleSave : undefined}
          disabled={!canSave}
          testID="button-save-listing"
        >
          <ThemedText style={[styles.saveButtonText, !canSave ? styles.saveButtonTextDisabled : null]}>
            {canSave ? "Save Product" : "Enter Name & Category"}
          </ThemedText>
        </Pressable>

        {saved ? (
          <View style={styles.confirmationBanner}>
            <Feather name="check-circle" size={16} color="#013220" />
            <ThemedText style={styles.confirmationText}>
              {isEdit ? "Product updated successfully" : "Product saved successfully"}
            </ThemedText>
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: Spacing.md,
  },
  textInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    marginTop: Spacing.sm,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  priceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  priceDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceSymbol: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginRight: 2,
  },
  priceValue: {
    fontSize: 32,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  priceRange: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  priceRangeText: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  priceFill: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  priceBar: {
    height: 4,
    backgroundColor: Colors.light.accent,
    borderRadius: 2,
  },
  notesInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: Spacing.sm,
  },
  imageUploader: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.light.divider,
    borderStyle: "dashed",
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  uploaderText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  previewCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    borderStyle: "dashed",
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  previewName: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  previewCategory: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: 2,
  },
  previewStock: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  saveButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#B8AF6F",
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  saveButtonTextDisabled: {
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
