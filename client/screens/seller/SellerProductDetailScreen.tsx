import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Rect } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getStockColor } from "@/data/sellerMockData";
import { useDataContext } from "@/context/DataContext";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import { formatInr } from "@/lib/formatCurrency";

export default function SellerProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { productId } = route.params || {};
  const [removing, setRemoving] = useState(false);

  const { sellerCatalog, deleteProduct } = useDataContext();
  const product = sellerCatalog.find((p) => p.id === productId);

  if (!product) {
    return (
      <View style={[styles.container, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>Product not found</ThemedText>
        </View>
      </View>
    );
  }

  const stockColor = getStockColor(product.status);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Product Details</ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 30) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imagePlaceholder}>
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="3" width="18" height="18" rx="3" stroke={Colors.light.textMuted} strokeWidth="1.5" />
            <Rect x="7" y="7" width="10" height="10" rx="2" stroke={Colors.light.textMuted} strokeWidth="1" opacity={0.5} />
          </Svg>
        </View>

        <View style={styles.categoryRow}>
          <ThemedText style={styles.categoryLabel}>{product.category}</ThemedText>
        </View>

        <ThemedText style={styles.productName}>{product.name}</ThemedText>
        <ThemedText style={styles.productPrice}>{formatInr(product.price)}</ThemedText>

        <View style={styles.detailCard}>
          <ThemedText style={styles.detailLabel}>Description</ThemedText>
          <ThemedText style={styles.detailText}>{product.description}</ThemedText>
        </View>

        <View style={styles.detailCard}>
          <ThemedText style={styles.detailLabel}>Stock</ThemedText>
          <View style={styles.stockRow}>
            <ThemedText style={styles.stockCount}>{product.stock} units</ThemedText>
            <View style={[styles.stockBadge, { backgroundColor: stockColor.bg }]}>
              <ThemedText style={[styles.stockBadgeText, { color: stockColor.text }]}>
                {product.status}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={styles.editBtn}
            onPress={() =>
              (navigation as any).navigate("AddEditProductListing", {
                listingId: product.id,
                prefill: product,
              })
            }
            testID="button-edit-product"
          >
            <Feather name="edit-2" size={16} color="#FFFFFF" />
            <ThemedText style={styles.editBtnText}>Edit Product</ThemedText>
          </Pressable>
          <Pressable
            style={styles.removeBtn}
            onPress={() => {
              Alert.alert("Remove product", "Remove this product from your store?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Remove",
                  style: "destructive",
                  onPress: () => {
                    void (async () => {
                      setRemoving(true);
                      await deleteProduct(product.id);
                      setRemoving(false);
                      navigation.goBack();
                    })();
                  },
                },
              ]);
            }}
            disabled={removing}
            testID="button-remove-product"
          >
            <Feather name="trash-2" size={16} color="#D4534A" />
            <ThemedText style={styles.removeBtnText}>Remove</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.light.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  categoryRow: {
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  productName: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: Spacing.lg,
  },
  detailCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    lineHeight: 22,
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stockCount: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  confirmBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  confirmText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#4A5A2B",
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.button,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.light.cardBackground,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "#D4534A30",
  },
  removeBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#D4534A",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textMuted,
  },
});
