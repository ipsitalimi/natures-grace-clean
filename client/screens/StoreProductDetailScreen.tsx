import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { productImages } from "@/data/storeProducts";
import { useDataContext } from "@/context/DataContext";
import { useCart } from "@/context/CartContext";

type StoreParamList = {
  StoreProductDetail: { productId: string };
  Cart: undefined;
};

export default function StoreProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<StoreParamList>>();
  const route = useRoute<RouteProp<StoreParamList, "StoreProductDetail">>();
  const { productId } = route.params;
  const { storeCategories } = useDataContext();
  const { addItem, getItemCount } = useCart();
  const product = storeCategories.flatMap((c) => c.products).find((p) => p.id === productId);
  const cartCount = getItemCount();

  const [showToast, setShowToast] = useState(false);
  const [toastOpacity] = useState(new Animated.Value(0));

  const handleAddToCart = () => {
    addItem(productId);
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowToast(false));
  };

  if (!product) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter} />
          <View style={styles.headerIconButton} />
        </View>
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>Product not found</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable
          style={styles.headerIconButton}
          onPress={() => navigation.navigate("Cart")}
          testID="button-detail-cart"
        >
          <Feather name="shopping-cart" size={22} color={Colors.light.accent} />
          {cartCount > 0 ? (
            <View style={styles.cartBadge}>
              <ThemedText style={styles.cartBadgeText}>{cartCount > 9 ? "9+" : cartCount}</ThemedText>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imagePlaceholder}>
          {productImages[product.id] ? (
            <Image source={productImages[product.id]} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.imageInnerCircle} />
          )}
        </View>

        <View style={styles.detailSection}>
          <ThemedText style={styles.categoryLabel}>{product.category}</ThemedText>
          <ThemedText style={styles.productName}>{product.name}</ThemedText>
          <ThemedText style={styles.productPrice}>
            ${product.price.toFixed(2)}
          </ThemedText>

          <View style={styles.divider} />

          <ThemedText style={styles.sectionTitle}>About this product</ThemedText>
          <ThemedText style={styles.productDescription}>
            {product.description}
          </ThemedText>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          style={({ pressed }) => [
            styles.addToCartButton,
            pressed && styles.addToCartButtonPressed,
          ]}
          onPress={handleAddToCart}
          testID="button-add-to-cart"
        >
          <Feather name="shopping-cart" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <ThemedText style={styles.addToCartText}>Add to Cart</ThemedText>
        </Pressable>
      </View>

      {showToast ? (
        <Animated.View style={[styles.toast, { opacity: toastOpacity, bottom: insets.bottom + 90 }]}>
          <Feather name="check-circle" size={18} color="#FFFFFF" />
          <ThemedText style={styles.toastText}>Added to cart</ThemedText>
          <Pressable onPress={() => navigation.navigate("Cart")} testID="button-toast-view-cart">
            <ThemedText style={styles.toastLink}>View Cart</ThemedText>
          </Pressable>
        </Animated.View>
      ) : null}
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
    position: "relative",
  },
  headerCenter: {
    flex: 1,
  },
  cartBadge: {
    position: "absolute",
    top: 2,
    right: 0,
    backgroundColor: "#D94F4F",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  imagePlaceholder: {
    height: 260,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imageInnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.accent,
    opacity: 0.1,
  },
  detailSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  productName: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.light.accent,
    marginBottom: Spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.divider,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  productDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.light.textSecondary,
  },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.light.backgroundRoot,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  addToCartButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  addToCartButtonPressed: {
    opacity: 0.85,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  toast: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  toastLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    textDecorationLine: "underline",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
});
