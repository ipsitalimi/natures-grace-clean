import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import AppHeader from "@/components/AppHeader";
import SellerDrawer from "@/components/SellerDrawer";
import { sellerStats } from "@/data/sellerMockData";
import productsIcon from "../../../assets/images/icons/seller-products-icon.png";
import inventoryIcon from "../../../assets/images/icons/seller-inventory-icon.png";
import storeIcon from "../../../assets/images/icons/seller-store-icon.png";
import analyticsIcon from "../../../assets/images/icons/seller-analytics-icon.png";

function ActionIcon({ source, size = 52 }: { source: any; size?: number }) {
  return (
    <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard]}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

function ActionCard({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : null]}
      onPress={onPress}
    >
      <View style={styles.actionIconWrap}>{icon}</View>
      <ThemedText style={styles.actionLabel}>{label}</ThemedText>
      {value ? <ThemedText style={styles.actionValue}>{value}</ThemedText> : null}
    </Pressable>
  );
}

export default function SellerHomeScreen() {
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
        <View style={styles.titleSection}>
          <ThemedText style={styles.appTitle}>Nature's Grace</ThemedText>
          <ThemedText style={styles.roleLabel}>Seller</ThemedText>
        </View>

        <View style={styles.greetingSection}>
          <ThemedText style={styles.greetingText}>
            Welcome back, <ThemedText style={styles.nameHighlight}>Priya</ThemedText>
          </ThemedText>
          <ThemedText style={styles.subGreeting}>Your store is looking great today.</ThemedText>
        </View>

        <ThemedText style={styles.sectionTitle}>Store Overview</ThemedText>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard label="Total Products" value={String(sellerStats.totalProducts)} color="#4A5A2B" />
            <StatCard label="Active Categories" value={String(sellerStats.activeCategories)} color="#6CB4D9" />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Low Stock Items" value={String(sellerStats.lowStockItems)} color="#D4943A" />
            <StatCard label="Revenue" value={`Rs.${(sellerStats.revenue / 1000).toFixed(1)}k`} color="#D4728B" />
          </View>
        </View>

        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>

        <View style={styles.actionsGrid}>
          <View style={styles.actionsRow}>
            <ActionCard
              icon={<ActionIcon source={productsIcon} />}
              label="Manage Products"
              onPress={() => (navigation as any).navigate("SellerProductsTab")}
            />
            <ActionCard
              icon={<ActionIcon source={inventoryIcon} />}
              label="Inventory"
              onPress={() => (navigation as any).navigate("SellerProductsTab")}
            />
          </View>
          <View style={styles.actionsRow}>
            <ActionCard
              icon={<ActionIcon source={storeIcon} />}
              label="Store Preview"
              onPress={() => (navigation as any).navigate("SellerProductsTab")}
            />
            <ActionCard
              icon={<ActionIcon source={analyticsIcon} />}
              label="Analytics"
              value="Coming soon"
            />
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  appTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
  },
  roleLabel: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  greetingSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  greetingText: {
    fontSize: 20,
    color: Colors.light.text,
    fontFamily: "ui-serif",
    marginBottom: 2,
  },
  nameHighlight: {
    fontWeight: "600",
    fontStyle: "italic",
    color: Colors.light.accent,
    fontSize: 20,
  },
  subGreeting: {
    fontSize: 15,
    color: Colors.light.textMuted,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    padding: Spacing.lg,
    alignItems: "center",
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
  },
  actionsGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
  },
  actionIconWrap: {
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: 2,
  },
  actionValue: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
  },
});
