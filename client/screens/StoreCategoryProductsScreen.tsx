import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { StoreProduct, productImages } from "@/data/storeProducts";
import { useDataContext } from "@/context/DataContext";

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
        {productImages[product.id] ? (
          <Image source={productImages[product.id]} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback} />
        )}
      </View>

      <View style={styles.productInfo}>
        <ThemedText style={styles.productName}>{product.name}</ThemedText>
        <ThemedText style={styles.productDescription} numberOfLines={2}>
          {product.description}
        </ThemedText>
        <View style={styles.productFooter}>
          <ThemedText style={styles.productPrice}>
            ${product.price.toFixed(2)}
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
  return storeCategories.find((c) => c.id === categoryId);
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route =
    useRoute<RouteProp<{ StoreCategoryProducts: { categoryId: string } }>>();
  const { categoryId } = route.params;
  const category = useGetCategory(categoryId);

  if (!category) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter} />
          <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
            <Feather name="bell" size={22} color={Colors.light.accent} />
          </Pressable>
        </View>
        <View style={styles.titleSection}>
          <ThemedText style={styles.pageTitle}>Products</ThemedText>
        </View>
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
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>{category.name}</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.subtitle}>
          {category.description}
        </ThemedText>

        {category.products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onPress={() =>
              navigation.navigate("StoreProductDetail", {
                productId: product.id,
              })
            }
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
  },
  headerCenter: {
    flex: 1,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
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
