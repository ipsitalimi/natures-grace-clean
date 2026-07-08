import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProductImageView from "@/components/ProductImageView";
import { getStoreCategoryById } from "@/data/storeCategories";
import { StoreProduct } from "@/data/storeProducts";
import { useDataContext } from "@/context/DataContext";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { formatInr } from "@/lib/formatCurrency";

type ParamList = {
  StoreCategoryProducts: { categoryId: string };
  StoreProductDetail: { productId: string };
};

type NavigationProp = NativeStackNavigationProp<ParamList>;

interface ProductCardProps {
  product: StoreProduct;
  onPress: () => void;
}

function ProductCard({ product, onPress }: ProductCardProps) {
  return (
    <View style={styles.productCard} testID={`card-product-${product.id}`}>
      <View style={styles.productImagePlaceholder}>
        <ProductImageView
          product={product}
          containerStyle={styles.productImage}
          imageStyle={styles.productImage}
        />
      </View>

      <View style={styles.productInfo}>
        <ThemedText style={styles.productName}>{product.name}</ThemedText>
        <ThemedText style={styles.productDescription} numberOfLines={2}>
          {product.description}
        </ThemedText>
        <View style={styles.productFooter}>
          <ThemedText style={styles.productPrice}>
            {formatInr(product.price)}
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.viewButton,
              pressed && styles.viewButtonPressed,
            ]}
            onPress={onPress}
            testID={`button-view-${product.id}`}
          >
            <ThemedText style={styles.viewButtonText}>View</ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function useGetCategory(categoryId: string) {
  const { storeCategories } = useDataContext();
  return storeCategories.find((c) => c.id === categoryId) ?? getStoreCategoryById(categoryId);
}

function getProductVisual(category: string): string {
  return "";
}

function PlaceholderIcon({ category }: { category: string }) {
  const color = Colors.light.accent;
  return (
    <View style={styles.iconPlaceholder}>
      <View
        style={[styles.iconCircle, { backgroundColor: color, opacity: 0.15 }]}
      />
      <View
        style={[
          styles.iconInner,
          { backgroundColor: color, opacity: 0.3 },
        ]}
      />
    </View>
  );
}

export default function StoreCategoryProductsScreen() {
  const { scrollPaddingBottom } = useLayoutInsets(Spacing.xl);
  const navigation = useNavigation<NavigationProp>();
  const route =
    useRoute<RouteProp<{ StoreCategoryProducts: { categoryId: string } }>>();
  const { categoryId } = route.params;
  const category = useGetCategory(categoryId);

  if (!category) {
    return (
      <View style={styles.container}>
        <BackHeader />
        <BelowHeaderTitle>Products</BelowHeaderTitle>
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>
            Category not found
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackHeader />

      <BelowHeaderTitle>{category.name}</BelowHeaderTitle>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.subtitle}>
          {category.description}
        </ThemedText>

        {category.products.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>
              No products in this category yet. Approved seller listings will appear here.
            </ThemedText>
          </View>
        ) : (
          category.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() =>
                navigation.navigate("StoreProductDetail", {
                  productId: product.id,
                })
              }
            />
          ))
        )}
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
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  productCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  productImagePlaceholder: {
    height: 140,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.accent,
    opacity: 0.1,
  },
  placeholderEmoji: {
    fontSize: 10,
    color: Colors.light.textSecondary,
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: "absolute",
  },
  iconInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  productInfo: {
    padding: Spacing.lg,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  productFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productPrice: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  viewButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.xs,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  viewButtonPressed: {
    opacity: 0.85,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
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
