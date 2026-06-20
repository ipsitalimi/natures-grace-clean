import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useDataContext } from "@/context/DataContext";
import { useOrdersContext } from "@/context/OrdersContext";
import { useReviews } from "@/context/ReviewsContext";
import { useSellerAnalytics } from "@/context/SellerAnalyticsContext";
import { useSignOut } from "@/hooks/useSignOut";
import { navigateAfterDrawerClose } from "@/lib/drawerNavigation";
import { fetchSellerStorefrontByProfileId } from "@/services/commerce/sellerStorefrontService";
import { getHeaderPaddingTop, getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

type RootStackParamList = {
  SessionHistory: undefined;
  Settings: undefined;
  Support: undefined;
  Login: undefined;
  ProductListings: undefined;
  SellerOrders: undefined;
  SellerAnalytics: undefined;
  SellerWallet: undefined;
  SellerPromotions: undefined;
  SellerReviews: undefined;
  SellerStoreCustomization: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

interface MenuItemProps {
  icon: string;
  title: string;
  badge?: string;
  isSignOut?: boolean;
  onPress?: () => void;
}

function MenuItem({ icon, title, badge, isSignOut, onPress }: MenuItemProps) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Feather name={icon as any} size={18} color={isSignOut ? "#D4534A" : Colors.light.accent} />
      </View>
      <ThemedText style={[styles.menuTitle, isSignOut && styles.signOutText]}>
        {title}
      </ThemedText>
      {badge ? (
        <View style={styles.menuBadge}>
          <ThemedText style={styles.menuBadgeText}>{badge}</ThemedText>
        </View>
      ) : null}
      <Feather
        name="chevron-right"
        size={16}
        color={isSignOut ? "#D4534A" : Colors.light.textMuted}
      />
    </Pressable>
  );
}

interface SellerDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function SellerDrawer({ visible, onClose }: SellerDrawerProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const signOut = useSignOut();
  const { profile } = useAuth();
  const { pendingOrderCount } = useOrdersContext();
  const { sellerCatalog } = useDataContext();
  const { sellerStoreStats } = useReviews();
  const { stats } = useSellerAnalytics();
  const [storeName, setStoreName] = useState("");
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const displayName =
    profile?.full_name?.trim() ||
    profile?.email?.split("@")[0] ||
    "Seller";
  const displayEmail = profile?.email ?? "";
  const storeLabel = storeName.trim() || "My Store";

  useEffect(() => {
    if (!visible || !profile?.id) return;
    let cancelled = false;
    void fetchSellerStorefrontByProfileId(profile.id).then((res) => {
      if (!cancelled && res.ok) setStoreName(res.storefront.storeName);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, profile?.id]);

  const storeRatingDisplay =
    sellerStoreStats.reviewCount > 0
      ? sellerStoreStats.avgRating.toFixed(1)
      : "—";

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible) return null;

  const go = (screen: keyof RootStackParamList) => {
    navigateAfterDrawerClose(onClose, () => navigation.navigate(screen as never));
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
              paddingTop: getHeaderPaddingTop(insets.top),
              paddingBottom: getScrollBottomPadding(insets.bottom, 20),
            },
          ]}
        >
          <View style={styles.drawerHeader}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={22} color={Colors.light.text} />
            </Pressable>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="8" r="4" fill={Colors.light.accent} opacity={0.8} />
                <Path
                  d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20"
                  stroke={Colors.light.accent}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </View>
            <ThemedText style={styles.userName}>{displayName}</ThemedText>
            <ThemedText style={styles.userEmail}>{displayEmail}</ThemedText>
            <View style={styles.storeRow}>
              <Feather name="shopping-bag" size={12} color={Colors.light.accent} />
              <ThemedText style={styles.storeName}>{storeLabel}</ThemedText>
            </View>
            <View style={styles.miniStats}>
              <View style={styles.miniStat}>
                <ThemedText style={styles.miniStatValue}>{stats.totalSales}</ThemedText>
                <ThemedText style={styles.miniStatLabel}>Sales</ThemedText>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <ThemedText style={styles.miniStatValue}>{storeRatingDisplay}</ThemedText>
                <ThemedText style={styles.miniStatLabel}>Rating</ThemedText>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <ThemedText style={styles.miniStatValue}>{sellerCatalog.length}</ThemedText>
                <ThemedText style={styles.miniStatLabel}>Products</ThemedText>
              </View>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.menuScroll}>
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Store</ThemedText>
              <MenuItem icon="shopping-bag" title="Orders" badge={`${pendingOrderCount}`} onPress={() => go("SellerOrders")} />
              <MenuItem icon="package" title="My Listings" onPress={() => go("ProductListings")} />
              <MenuItem icon="bar-chart-2" title="Analytics" onPress={() => go("SellerAnalytics")} />
              <MenuItem icon="credit-card" title="Wallet & Earnings" onPress={() => go("SellerWallet")} />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Marketing</ThemedText>
              <MenuItem icon="tag" title="Promotions & Offers" onPress={() => go("SellerPromotions")} />
              <MenuItem icon="star" title="Reviews & Ratings" onPress={() => go("SellerReviews")} />
              <MenuItem icon="edit" title="Store Customization" onPress={() => go("SellerStoreCustomization")} />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Account</ThemedText>
              <MenuItem icon="clock" title="Order History" onPress={() => go("SellerOrders")} />
              <MenuItem icon="settings" title="Settings" onPress={() => go("Settings")} />
              <MenuItem icon="help-circle" title="Support" onPress={() => go("Support")} />
            </View>

            <View style={styles.signOutSection}>
              <MenuItem
                icon="log-out"
                title="Sign Out"
                isSignOut
                onPress={() => {
                  navigateAfterDrawerClose(onClose, () => {
                    void signOut();
                  });
                }}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: Spacing.lg,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  closeButton: { padding: 4 },
  profileSection: {
    alignItems: "center",
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.brownLight}60`,
    marginBottom: Spacing.md,
    gap: 4,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: `${Colors.light.accent}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontFamily: "Nunito_400Regular",
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.light.accent}10`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 2,
  },
  storeName: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  miniStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  miniStat: {
    alignItems: "center",
  },
  miniStatValue: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  miniStatLabel: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  miniStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: `${Colors.light.divider}40`,
  },
  menuScroll: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  menuIconContainer: {
    width: 28,
    marginRight: 12,
    alignItems: "center",
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  menuBadge: {
    backgroundColor: "#D4943A",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
  },
  menuBadgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  signOutText: { color: "#D4534A" },
  signOutSection: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: `${Colors.light.brownLight}60`,
    paddingTop: 8,
  },
});
