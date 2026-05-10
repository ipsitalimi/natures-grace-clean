import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Rect } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import AppHeader from "@/components/AppHeader";
import SellerDrawer from "@/components/SellerDrawer";
import {
  sellerProducts,
  getStockColor,
  getCategoryShortName,
  type SellerProduct,
} from "@/data/sellerMockData";

function ImagePlaceholder() {
  return (
    <View style={styles.imagePlaceholder}>
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="3" width="18" height="18" rx="3" stroke={Colors.light.textMuted} strokeWidth="1.5" />
        <Rect x="7" y="7" width="10" height="10" rx="2" stroke={Colors.light.textMuted} strokeWidth="1" opacity={0.5} />
      </Svg>
    </View>
  );
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "Spiritual Manifestation & Protection":
      return "#7B68EE";
    case "Mindful Radiance":
      return "#E8A0B5";
    case "Conscious Nutrition":
      return "#4A9A5B";
    case "Spirit & Space":
      return "#6CB4D9";
    case "Sacred Rituals":
      return "#D4943A";
    case "Daily Vitality":
      return "#7BC47F";
    default:
      return Colors.light.accent;
  }
}

function ProductCard({ product, onPress, onEdit }: { product: SellerProduct; onPress: () => void; onEdit: () => void }) {
  const stockColor = getStockColor(product.status);
  const catColor = getCategoryColor(product.category);

  return (
    <Pressable style={styles.productCard} onPress={onPress} testID={`product-card-${product.id}`}>
      <ImagePlaceholder />
      <View style={styles.productInfo}>
        <ThemedText style={styles.productName} numberOfLines={1}>{product.name}</ThemedText>
        <View style={styles.productMeta}>
          <View style={[styles.categoryBadge, { backgroundColor: `${catColor}18` }]}>
            <ThemedText style={[styles.categoryText, { color: catColor }]}>
              {getCategoryShortName(product.category)}
            </ThemedText>
          </View>
          <View style={[styles.stockBadge, { backgroundColor: stockColor.bg }]}>
            <ThemedText style={[styles.stockText, { color: stockColor.text }]}>
              {product.status === "Active" ? `${product.stock} in stock` : product.status}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={styles.productPrice}>Rs. {product.price.toLocaleString()}</ThemedText>
      </View>
      <Pressable style={styles.editButton} onPress={onEdit} testID={`edit-product-${product.id}`}>
        <Feather name="edit-2" size={16} color={Colors.light.accent} />
      </Pressable>
    </Pressable>
  );
}

export default function SellerProductsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <View style={styles.container}>
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <AppHeader onProfilePress={() => setDrawerVisible(true)} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backToHomeBtn}
          onPress={() => (navigation as any).navigate("SellerHomeTab")}
          testID="button-back-home"
        >
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.backToHomeText}>Home</ThemedText>
        </Pressable>

        <View style={styles.headerRow}>
          <ThemedText style={styles.pageTitle}>Products</ThemedText>
          <Pressable
            style={styles.addButton}
            onPress={() => (navigation as any).navigate("AddEditProductListing")}
            testID="button-add-product"
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <ThemedText style={styles.addButtonText}>Add Product</ThemedText>
          </Pressable>
        </View>

        <Pressable
          style={styles.listingsLink}
          onPress={() => (navigation as any).navigate("ProductListings")}
          testID="button-product-listings"
        >
          <Feather name="list" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.listingsLinkText}>Product Listings</ThemedText>
          <Feather name="chevron-right" size={16} color={Colors.light.accent} />
        </Pressable>

        {sellerProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onPress={() => (navigation as any).navigate("SellerProductDetail", { productId: product.id })}
            onEdit={() => (navigation as any).navigate("AddEditProductListing", { listingId: undefined, prefill: product })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  backToHomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginBottom: Spacing.md,
    paddingVertical: 4,
  },
  backToHomeText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.button,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  listingsLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    gap: 8,
  },
  listingsLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: `${Colors.light.accent}08`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
});
