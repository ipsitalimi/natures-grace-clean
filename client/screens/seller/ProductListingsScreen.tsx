import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Rect } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { productListingsStore, type ProductListing } from "@/data/productListingsStore";

function getCategoryColor(category: string): { bg: string; text: string } {
  switch (category) {
    case "Spiritual Manifestation & Protection":
      return { bg: "#7B68EE22", text: "#7B68EE" };
    case "Mindful Radiance":
      return { bg: "#E8A0B522", text: "#9B5C73" };
    case "Conscious Nutrition":
      return { bg: "#4A9A5B22", text: "#4A7C59" };
    case "Spirit & Space":
      return { bg: "#6CB4D922", text: "#3A7CA5" };
    case "Sacred Rituals":
      return { bg: "#D4943A22", text: "#8B6F47" };
    case "Daily Vitality":
      return { bg: "#7BC47F22", text: "#4A7C59" };
    default:
      return { bg: "rgba(1,50,32,0.08)", text: Colors.light.accent };
  }
}

export default function ProductListingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [listings, setListings] = useState<ProductListing[]>(productListingsStore.getListings());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (isFocused) {
      setListings(productListingsStore.getListings());
    }
  }, [isFocused]);

  useEffect(() => {
    const unsub = productListingsStore.subscribe(() => {
      setListings(productListingsStore.getListings());
    });
    return unsub;
  }, []);

  const handleDelete = (id: string) => {
    productListingsStore.deleteListing(id);
    setDeleteConfirm(id);
    setTimeout(() => setDeleteConfirm(null), 2000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={20} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Product Listings</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.addButton}
          onPress={() => (navigation as any).navigate("AddEditProductListing", { listingId: null })}
          testID="button-add-listing"
        >
          <View style={styles.addIconCircle}>
            <Feather name="plus" size={18} color="#FFFFFF" />
          </View>
          <ThemedText style={styles.addButtonText}>Add Product Listing</ThemedText>
        </Pressable>

        <ThemedText style={styles.sectionSubtitle}>
          Define what users will see in the NG Store.
        </ThemedText>

        {listings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="inbox" size={32} color={Colors.light.textMuted} />
            <ThemedText style={styles.emptyText}>No listings yet</ThemedText>
            <ThemedText style={styles.emptyHint}>
              Tap the button above to create your first product listing.
            </ThemedText>
          </View>
        ) : null}

        {listings.map((listing) => {
          const cc = getCategoryColor(listing.category);
          return (
            <View key={listing.id} style={styles.listingCard} testID={`listing-card-${listing.id}`}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardImageAndInfo}>
                  <View style={styles.miniImagePlaceholder}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Rect x="3" y="3" width="18" height="18" rx="3" stroke={Colors.light.textMuted} strokeWidth="1.5" />
                    </Svg>
                  </View>
                  <View style={styles.cardInfo}>
                    <ThemedText style={styles.listingName} numberOfLines={1}>{listing.name}</ThemedText>
                    <View style={[styles.categoryBadge, { backgroundColor: cc.bg }]}>
                      <ThemedText style={[styles.categoryText, { color: cc.text }]}>
                        {listing.category}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.editIconBtn}
                    onPress={() =>
                      (navigation as any).navigate("AddEditProductListing", { listingId: listing.id })
                    }
                    testID={`button-edit-${listing.id}`}
                  >
                    <Feather name="edit-2" size={15} color={Colors.light.accent} />
                  </Pressable>
                  <Pressable
                    style={styles.deleteIconBtn}
                    onPress={() => handleDelete(listing.id)}
                    testID={`button-delete-${listing.id}`}
                  >
                    <Feather name="trash-2" size={15} color="#8B3A3A" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.priceSymbol}>&#8377;</ThemedText>
                  <ThemedText style={styles.priceText}>
                    {listing.price.toLocaleString()}
                  </ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <Feather name="package" size={14} color={Colors.light.textMuted} />
                  <ThemedText style={styles.detailText}>
                    {listing.stock} in stock
                  </ThemedText>
                </View>
              </View>

              {listing.description ? (
                <ThemedText style={styles.descText} numberOfLines={2}>
                  {listing.description}
                </ThemedText>
              ) : null}
            </View>
          );
        })}

        {deleteConfirm ? (
          <View style={styles.deleteBanner}>
            <Feather name="check-circle" size={14} color="#8B3A3A" />
            <ThemedText style={styles.deleteBannerText}>Listing removed</ThemedText>
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  addIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: Spacing.xl,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing["3xl"],
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
  },
  listingCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  cardImageAndInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  miniImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: `${Colors.light.accent}08`,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  listingName: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
  cardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  editIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(1, 50, 32, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(139, 58, 58, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardDetails: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  priceSymbol: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  priceText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  descText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    lineHeight: 18,
  },
  deleteBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 58, 58, 0.08)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  deleteBannerText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#8B3A3A",
  },
});
