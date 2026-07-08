import React, { useState, useRef, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal, LayoutChangeEvent, ActivityIndicator, RefreshControl } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, BorderRadius } from "@/constants/theme";
import { Layout, LayoutSpacing } from "@/constants/layout";
import { PageLayout } from "@/components/layout";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import ProductImageView from "@/components/ProductImageView";
import { StoreCategory, StoreProduct } from "@/data/storeProducts";
import { useDataContext } from "@/context/DataContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatInr } from "@/lib/formatCurrency";

type StoreStackParamList = {
  StoreProductDetail: { productId: string };
  Cart: undefined;
};

type MainTabParamList = {
  HomeTab: undefined;
  StoreTab: undefined;
};

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<StoreStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

function getCategoryIcon(icon: string, size: number, color: string) {
  switch (icon) {
    case "star":
      return <Feather name="star" size={size} color={color} />;
    case "sun":
      return <Feather name="sun" size={size} color={color} />;
    case "heart":
      return <Feather name="heart" size={size} color={color} />;
    case "home":
      return <Feather name="home" size={size} color={color} />;
    case "zap":
      return <Feather name="zap" size={size} color={color} />;
    case "activity":
      return <Feather name="activity" size={size} color={color} />;
    default:
      return <Feather name="circle" size={size} color={color} />;
  }
}

interface ProductCardProps {
  product: StoreProduct;
  onPress: () => void;
}

function ProductCard({ product, onPress }: ProductCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.productCard,
        pressed && styles.productCardPressed,
      ]}
      onPress={onPress}
      testID={`card-product-${product.id}`}
    >
      <View style={styles.productImagePlaceholder}>
        <ProductImageView
          product={product}
          containerStyle={styles.productImage}
          imageStyle={styles.productImage}
          iconSize={20}
        />
      </View>
      <View style={styles.productInfo}>
        <ThemedText style={styles.productName} numberOfLines={2}>{product.name}</ThemedText>
        <ThemedText style={styles.productPrice}>
          {formatInr(product.price)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function NGStoreScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { headerPaddingTop } = useLayoutInsets();
  const navigation = useNavigation<NavigationProp>();
  const scrollRef = useRef<ScrollView>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sectionOffsets, setSectionOffsets] = useState<Record<string, number>>({});
  const { storeCategories, dataLoading, dataError, refreshContent } = useDataContext();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshContent({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [refreshContent]);

  useFocusEffect(
    useCallback(() => {
      void refreshContent({ silent: true });
    }, [refreshContent])
  );
  const { homeContent } = usePlatformConfig();
  const { profile } = useAuth();
  const showSellerApplication = profile?.role !== "Seller" && profile?.role !== "Practitioner";
  const storeCategoriesList = storeCategories.map((cat) => ({
    ...cat,
    products: cat.products.filter(
      (p) => !p.approvalStatus || p.approvalStatus === "Approved"
    ),
  }));
  const featuredIds = homeContent.featuredProductIds;
  const { getItemCount } = useCart();
  const cartCount = getItemCount();

  const handleSectionLayout = (categoryId: string) => (event: LayoutChangeEvent) => {
    const { y } = event.nativeEvent.layout;
    setSectionOffsets((prev) => ({ ...prev, [categoryId]: y }));
  };

  const scrollToCategory = (categoryId: string) => {
    setMenuVisible(false);
    const offset = sectionOffsets[categoryId];
    if (offset !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: offset, animated: true });
    }
  };

  const goBackToHome = () => {
    navigation.navigate("HomeTab");
  };

  return (
    <PageLayout
      title="NG Store"
      titleInHeader
      header="action"
      headerProps={{
        onBackPress: goBackToHome,
        showNotifications: false,
        rightAction: (
          <View style={styles.headerActions}>
            <Pressable
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
              testID="button-store-menu"
            >
              <Feather name="menu" size={Layout.headerIconSize} color={Colors.light.accent} />
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => navigation.navigate("Cart" as never)}
              testID="button-store-cart"
            >
              <Feather name="shopping-cart" size={Layout.headerIconSize} color={Colors.light.accent} />
              {cartCount > 0 ? (
                <View style={styles.cartBadge}>
                  <ThemedText style={styles.cartBadgeText}>{cartCount > 9 ? "9+" : cartCount}</ThemedText>
                </View>
              ) : null}
            </Pressable>
          </View>
        ),
      }}
      footerInset={tabBarHeight}
      scrollRef={scrollRef}
      scrollViewProps={{
        refreshControl:
          !dataLoading && !dataError ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Colors.light.accent}
            />
          ) : undefined,
      }}
    >
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuDropdown, { marginTop: headerPaddingTop + 56 }]}>
            <ThemedText style={styles.menuTitle}>Jump to Category</ThemedText>
            {storeCategoriesList.map((category) => (
              <Pressable
                key={category.id}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
                onPress={() => scrollToCategory(category.id)}
                testID={`menu-item-${category.id}`}
              >
                <View style={styles.menuItemIcon}>
                  {getCategoryIcon(category.icon, 16, Colors.light.accent)}
                </View>
                <ThemedText style={styles.menuItemText}>{category.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

        {dataLoading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color={Colors.light.accent} size="large" />
            <ThemedText style={styles.stateHint}>Loading store…</ThemedText>
          </View>
        ) : dataError ? (
          <View style={styles.centeredState}>
            <Feather name="alert-circle" size={36} color={Colors.light.textSecondary} />
            <ThemedText style={styles.stateHint}>{dataError}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={() => void refreshContent()}>
              <ThemedText style={styles.retryText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
        <ThemedText style={styles.subtitle}>
          Your Holistic Sanctuary, All in One App
        </ThemedText>
        <ThemedText style={styles.introBody}>
          We believe true health is a harmony of the physical, mental, and
          emotional. Explore our community-vetted products designed to support
          your daily rituals and wellbeing.
        </ThemedText>

        <View style={styles.divider} />

        {storeCategoriesList.map((category) => (
          <View
            key={category.id}
            style={styles.categorySection}
            onLayout={handleSectionLayout(category.id)}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                {getCategoryIcon(category.icon, 18, Colors.light.accent)}
              </View>
              <View style={styles.sectionHeaderText}>
                <ThemedText style={styles.sectionTitle}>{category.name}</ThemedText>
                <ThemedText style={styles.sectionDescription}>
                  {category.description}
                </ThemedText>
              </View>
            </View>

            <View style={styles.productsGrid}>
              {category.products.length === 0 ? (
                <View style={styles.emptyCategory}>
                  <ThemedText style={styles.emptyCategoryText}>
                    No products in this category yet — sellers can list here soon.
                  </ThemedText>
                </View>
              ) : (
                category.products.map((product) => (
                  <View key={product.id} style={styles.productCardWrapper}>
                    <ProductCard
                      product={product}
                      onPress={() =>
                        navigation.navigate("StoreProductDetail", {
                          productId: product.id,
                        })
                      }
                    />
                  </View>
                ))
              )}
            </View>
          </View>
        ))}

        {showSellerApplication ? (
          <Pressable
            style={styles.becomeSellerButton}
            onPress={() => navigation.navigate("SellerApplication" as never)}
            testID="button-become-seller"
          >
            <Feather name="shopping-bag" size={16} color={Colors.light.accent} />
            <ThemedText style={styles.becomeSellerText}>Become a Seller</ThemedText>
          </Pressable>
        ) : null}
          </>
        )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: LayoutSpacing.xs,
  },
  headerIconButton: {
    padding: LayoutSpacing.sm,
    position: "relative",
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
  headerCenter: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: LayoutSpacing.lg,
    marginBottom: LayoutSpacing.lg,
  },
  titleRowSpacer: {
    width: 40,
  },
  title: {
    flex: 1,
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  titleRowRight: {
    width: 40,
    alignItems: "flex-end",
  },
  menuButton: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: LayoutSpacing.lg,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginBottom: LayoutSpacing.md,
  },
  introBody: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginBottom: LayoutSpacing.xl,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: Colors.light.divider,
    alignSelf: "center",
    marginBottom: LayoutSpacing.xxl,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  menuDropdown: {
    marginHorizontal: LayoutSpacing.xl,
    backgroundColor: Colors.light.backgroundDefault,
    borderRadius: BorderRadius.md,
    paddingVertical: LayoutSpacing.md,
    paddingHorizontal: LayoutSpacing.lg,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginBottom: LayoutSpacing.md,
    paddingHorizontal: LayoutSpacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: LayoutSpacing.sm,
    borderRadius: BorderRadius.xs,
  },
  menuItemPressed: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  menuItemIcon: {
    width: 28,
    alignItems: "center",
    marginRight: LayoutSpacing.md,
  },
  menuItemText: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  categorySection: {
    marginBottom: LayoutSpacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: LayoutSpacing.lg,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: LayoutSpacing.md,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  sectionDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  productCardWrapper: {
    width: "50%",
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  productCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  productCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  productImagePlaceholder: {
    height: 100,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  placeholderCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.accent,
    opacity: 0.08,
  },
  productInfo: {
    padding: LayoutSpacing.md,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
    lineHeight: 17,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  becomeSellerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: LayoutSpacing.md,
    paddingHorizontal: LayoutSpacing.xl,
    gap: LayoutSpacing.sm,
    marginTop: LayoutSpacing.md,
  },
  becomeSellerText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  centeredState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: LayoutSpacing.xl * 2,
    gap: 12,
  },
  stateHint: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    paddingHorizontal: LayoutSpacing.lg,
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.accent,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyCategory: {
    width: "100%",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: LayoutSpacing.lg,
    alignItems: "center",
  },
  emptyCategoryText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
