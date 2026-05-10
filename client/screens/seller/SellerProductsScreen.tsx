import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, FlatList } from "react-native";
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
  SELLER_CATEGORIES,
  type SellerProduct,
} from "@/data/sellerMockData";

type ViewMode = "list" | "grid";
type StatusFilter = "All" | "Active" | "Low Stock" | "Out of Stock";

function getCategoryColor(category: string): string {
  switch (category) {
    case "Spiritual Manifestation & Protection": return "#7B68EE";
    case "Mindful Radiance": return "#E8A0B5";
    case "Conscious Nutrition": return "#4A9A5B";
    case "Spirit & Space": return "#6CB4D9";
    case "Sacred Rituals": return "#D4943A";
    case "Daily Vitality": return "#7BC47F";
    default: return Colors.light.accent;
  }
}

function ImagePlaceholder({ size = 56 }: { size?: number }) {
  return (
    <View style={[styles.imagePlaceholder, { width: size, height: size }]}>
      <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="3" width="18" height="18" rx="3" stroke={Colors.light.textMuted} strokeWidth="1.5" />
        <Rect x="7" y="7" width="10" height="10" rx="2" stroke={Colors.light.textMuted} strokeWidth="1" opacity={0.5} />
      </Svg>
    </View>
  );
}

function ProductListCard({ product, onPress, onEdit }: { product: SellerProduct; onPress: () => void; onEdit: () => void }) {
  const stockColor = getStockColor(product.status);
  const catColor = getCategoryColor(product.category);

  return (
    <Pressable style={styles.listCard} onPress={onPress} testID={`product-card-${product.id}`}>
      <ImagePlaceholder size={58} />
      <View style={styles.listInfo}>
        <ThemedText style={styles.listName} numberOfLines={1}>{product.name}</ThemedText>
        <View style={styles.badgeRow}>
          <View style={[styles.catBadge, { backgroundColor: `${catColor}18` }]}>
            <ThemedText style={[styles.catBadgeText, { color: catColor }]}>
              {getCategoryShortName(product.category)}
            </ThemedText>
          </View>
          <View style={[styles.stockBadge, { backgroundColor: stockColor.bg }]}>
            <ThemedText style={[styles.stockBadgeText, { color: stockColor.text }]}>
              {product.status === "Active" ? `${product.stock} in stock` : product.status}
            </ThemedText>
          </View>
        </View>
        <View style={styles.metricRow}>
          <Feather name="eye" size={11} color={Colors.light.textMuted} />
          <ThemedText style={styles.metricText}>{product.views}</ThemedText>
          <Feather name="heart" size={11} color={Colors.light.textMuted} />
          <ThemedText style={styles.metricText}>{product.saves}</ThemedText>
          <Feather name="shopping-cart" size={11} color={Colors.light.textMuted} />
          <ThemedText style={styles.metricText}>{product.cartAdds}</ThemedText>
          <Feather name="check-circle" size={11} color={Colors.light.textMuted} />
          <ThemedText style={styles.metricText}>{product.purchases}</ThemedText>
        </View>
        <ThemedText style={styles.listPrice}>Rs. {product.price.toLocaleString()}</ThemedText>
      </View>
      <Pressable style={styles.editBtn} onPress={onEdit} testID={`edit-product-${product.id}`}>
        <Feather name="edit-2" size={16} color={Colors.light.accent} />
      </Pressable>
    </Pressable>
  );
}

function ProductGridCard({ product, onPress, onEdit }: { product: SellerProduct; onPress: () => void; onEdit: () => void }) {
  const stockColor = getStockColor(product.status);
  const catColor = getCategoryColor(product.category);

  return (
    <Pressable style={styles.gridCard} onPress={onPress} testID={`product-grid-${product.id}`}>
      <ImagePlaceholder size={80} />
      {product.status !== "Active" ? (
        <View style={[styles.gridStockBadge, { backgroundColor: stockColor.bg }]}>
          <ThemedText style={[styles.gridStockText, { color: stockColor.text }]}>
            {product.status}
          </ThemedText>
        </View>
      ) : null}
      <ThemedText style={styles.gridName} numberOfLines={2}>{product.name}</ThemedText>
      <View style={[styles.catBadge, { backgroundColor: `${catColor}18`, alignSelf: "flex-start" }]}>
        <ThemedText style={[styles.catBadgeText, { color: catColor }]}>
          {getCategoryShortName(product.category)}
        </ThemedText>
      </View>
      <ThemedText style={styles.gridPrice}>Rs. {product.price.toLocaleString()}</ThemedText>
      <View style={styles.gridMetrics}>
        <Feather name="eye" size={11} color={Colors.light.textMuted} />
        <ThemedText style={styles.metricText}>{product.views}</ThemedText>
        <Feather name="check-circle" size={11} color={Colors.light.textMuted} />
        <ThemedText style={styles.metricText}>{product.purchases}</ThemedText>
      </View>
      <Pressable style={styles.gridEditBtn} onPress={onEdit} testID={`edit-grid-${product.id}`}>
        <Feather name="edit-2" size={13} color={Colors.light.accent} />
      </Pressable>
    </Pressable>
  );
}

function EmptyState() {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <Feather name="package" size={28} color={Colors.light.textMuted} />
      </View>
      <ThemedText style={styles.emptyTitle}>
        Your wellness shelf is waiting for its first product.
      </ThemedText>
      <ThemedText style={styles.emptySub}>
        Add your first product to start selling on Nature's Grace.
      </ThemedText>
      <Pressable
        style={styles.emptyBtn}
        onPress={() => navigation.navigate("AddEditProductListing", {})}
        testID="button-empty-add"
      >
        <Feather name="plus" size={16} color="#FFFFFF" />
        <ThemedText style={styles.emptyBtnText}>Add Product</ThemedText>
      </Pressable>
    </View>
  );
}

export default function SellerProductsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const filtered = useMemo(() => {
    return sellerProducts.filter((p) => {
      const matchSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "All" || p.category === categoryFilter;
      const matchStatus = statusFilter === "All" || p.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [search, categoryFilter, statusFilter]);

  const lowStockCount = sellerProducts.filter((p) => p.status === "Low Stock").length;

  return (
    <View style={styles.container}>
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <AppHeader onProfilePress={() => setDrawerVisible(true)} />

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={Colors.light.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor={Colors.light.textMuted}
            testID="input-search"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")} testID="button-clear-search">
              <Feather name="x" size={16} color={Colors.light.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.viewBtn, viewMode === "list" && styles.viewBtnActive]}
            onPress={() => setViewMode("list")}
            testID="button-list-view"
          >
            <Feather name="list" size={16} color={viewMode === "list" ? "#FFFFFF" : Colors.light.textMuted} />
          </Pressable>
          <Pressable
            style={[styles.viewBtn, viewMode === "grid" && styles.viewBtnActive]}
            onPress={() => setViewMode("grid")}
            testID="button-grid-view"
          >
            <Feather name="grid" size={16} color={viewMode === "grid" ? "#FFFFFF" : Colors.light.textMuted} />
          </Pressable>
        </View>
      </View>

      {lowStockCount > 0 ? (
        <View style={styles.lowStockBanner}>
          <Feather name="alert-triangle" size={14} color="#B8860B" />
          <ThemedText style={styles.lowStockText}>
            {lowStockCount} product{lowStockCount > 1 ? "s" : ""} running low on stock
          </ThemedText>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {(["All", "Active", "Low Stock", "Out of Stock"] as StatusFilter[]).map((s) => (
          <Pressable
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
            testID={`status-filter-${s.replace(/\s+/g, "-").toLowerCase()}`}
          >
            <ThemedText style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
              {s}
            </ThemedText>
          </Pressable>
        ))}
        <View style={styles.filterDivider} />
        {["All", ...SELLER_CATEGORIES].map((cat) => (
          <Pressable
            key={cat}
            style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
            onPress={() => setCategoryFilter(cat)}
            testID={`cat-filter-${cat.replace(/\s+/g, "-").toLowerCase()}`}
          >
            <ThemedText style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextActive]}>
              {cat === "All" ? "All Categories" : getCategoryShortName(cat)}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.listHeader}>
        <ThemedText style={styles.listCount}>
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
        </ThemedText>
        <Pressable
          style={styles.listingsLink}
          onPress={() => navigation.navigate("ProductListings")}
          testID="button-product-listings"
        >
          <Feather name="list" size={14} color={Colors.light.accent} />
          <ThemedText style={styles.listingsLinkText}>Listings</ThemedText>
          <Feather name="chevron-right" size={14} color={Colors.light.accent} />
        </Pressable>
      </View>

      {viewMode === "list" ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductListCard
              product={item}
              onPress={() => navigation.navigate("SellerProductDetail", { productId: item.id })}
              onEdit={() => navigation.navigate("AddEditProductListing", { listingId: undefined, prefill: item })}
            />
          )}
          contentContainerStyle={[
            styles.flatListContent,
            filtered.length === 0 && styles.flatListEmpty,
            { paddingBottom: tabBarHeight + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <ProductGridCard
              product={item}
              onPress={() => navigation.navigate("SellerProductDetail", { productId: item.id })}
              onEdit={() => navigation.navigate("AddEditProductListing", { listingId: undefined, prefill: item })}
            />
          )}
          contentContainerStyle={[
            styles.flatListContent,
            filtered.length === 0 && styles.flatListEmpty,
            { paddingBottom: tabBarHeight + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
        />
      )}

      <Pressable
        style={[styles.fab, { bottom: tabBarHeight + 16 }]}
        onPress={() => navigation.navigate("AddEditProductListing", {})}
        testID="button-fab-add"
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  searchRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    padding: 0,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: 3,
  },
  viewBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  viewBtnActive: {
    backgroundColor: Colors.light.accent,
  },
  lowStockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: "rgba(212,148,58,0.1)",
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  lowStockText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#B8860B",
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.cardBackground,
  },
  filterChipActive: {
    backgroundColor: Colors.light.accent,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  filterDivider: {
    width: 1,
    backgroundColor: `${Colors.light.divider}40`,
    marginHorizontal: 4,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  listCount: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  listingsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  listingsLinkText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  flatListContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  flatListEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  gridRow: {
    gap: Spacing.md,
  },
  listCard: {
    flexDirection: "row",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.md,
  },
  imagePlaceholder: {
    borderRadius: 10,
    backgroundColor: `${Colors.light.accent}08`,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  listInfo: {
    flex: 1,
    gap: 4,
  },
  listName: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metricText: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  listPrice: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  editBtn: {
    padding: 8,
  },
  gridCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: 6,
    position: "relative",
  },
  gridStockBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridStockText: {
    fontSize: 9,
    fontFamily: "Nunito_700Bold",
  },
  gridName: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    lineHeight: 18,
  },
  gridPrice: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  gridMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  gridEditBtn: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 22,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.button,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
