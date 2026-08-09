import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  BackHandler,
  PanResponder,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Colors } from "@/constants/theme";
import { Layout, LayoutSpacing } from "@/constants/layout";
import { useAppBrandCopy } from "@/hooks/useAppBrandCopy";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DRAWER_WIDTH = 260;

export type AdminScreenName =
  | "Dashboard"
  | "Users"
  | "Applications"
  | "Sellers"
  | "Practitioners"
  | "Store"
  | "Featured"
  | "Community"
  | "Resources"
  | "Prompts"
  | "Analytics"
  | "Notifications"
  | "PromoCodes"
  | "Reviews"
  | "Support"
  | "Legal"
  | "Payouts"
  | "Refunds"
  | "AuditLog"
  | "Settings";

interface DrawerItem {
  name: AdminScreenName;
  icon: keyof typeof Feather.glyphMap;
  label: string;
}

const drawerItems: DrawerItem[] = [
  { name: "Dashboard", icon: "grid", label: "Dashboard" },
  { name: "Users", icon: "users", label: "Users" },
  { name: "Applications", icon: "inbox", label: "Applications" },
  { name: "Sellers", icon: "briefcase", label: "Sellers" },
  { name: "Practitioners", icon: "heart", label: "Practitioners" },
  { name: "Store", icon: "shopping-bag", label: "Products" },
  { name: "Featured", icon: "star", label: "Featured / Home" },
  { name: "Community", icon: "message-circle", label: "Community" },
  { name: "Resources", icon: "book-open", label: "Resources" },
  { name: "Prompts", icon: "edit-3", label: "Daily Prompts" },
  { name: "Analytics", icon: "bar-chart-2", label: "Analytics" },
  { name: "Notifications", icon: "bell", label: "Notifications" },
  { name: "PromoCodes", icon: "tag", label: "Promo Codes" },
  { name: "Reviews", icon: "star", label: "Reviews" },
  { name: "Support", icon: "help-circle", label: "Support" },
  { name: "Payouts", icon: "credit-card", label: "Withdrawals" },
  { name: "Refunds", icon: "rotate-ccw", label: "Refunds" },
  { name: "AuditLog", icon: "clipboard", label: "Audit Log" },
  { name: "Legal", icon: "file-text", label: "Legal" },
  { name: "Settings", icon: "settings", label: "Settings" },
];

const HEADER_TITLES: Partial<Record<AdminScreenName, string>> = {
  Dashboard: "Admin Dashboard",
};

function getHeaderTitle(screen: AdminScreenName): string {
  return HEADER_TITLES[screen] ?? drawerItems.find((i) => i.name === screen)?.label ?? "Admin";
}

interface AdminLayoutProps {
  activeScreen: AdminScreenName;
  onNavigate: (screen: AdminScreenName) => void;
  onLogout: () => void | Promise<void>;
  children: React.ReactNode;
}

export default function AdminLayout({
  activeScreen,
  onNavigate,
  onLogout,
  children,
}: AdminLayoutProps) {
  const { appNameDisplay, appNameMuted, loading: brandLoading } = useAppBrandCopy();
  const insets = useSafeAreaInsets();
  const [headerOffset, setHeaderOffset] = useState(0);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerMounted, setDrawerMounted] = React.useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const drawerOpenRef = useRef(drawerOpen);
  drawerOpenRef.current = drawerOpen;

  useEffect(() => {
    if (drawerOpen) {
      setDrawerMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
      return;
    }

    if (!drawerMounted) return;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) setDrawerMounted(false);
    });
  }, [drawerOpen, drawerMounted, slideAnim, overlayAnim]);

  useEffect(() => {
    if (!drawerOpen) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      closeDrawer();
      return true;
    });
    return () => subscription.remove();
  }, [drawerOpen, closeDrawer]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        drawerOpenRef.current && gesture.dx < -6 && Math.abs(gesture.dy) < 28,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          slideAnim.setValue(Math.max(-DRAWER_WIDTH + gesture.dx, -DRAWER_WIDTH));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -DRAWER_WIDTH * 0.22 || gesture.vx < -0.45) {
          closeDrawer();
          return;
        }
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const handleDrawerNavigate = (screen: AdminScreenName) => {
    closeDrawer();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => onNavigate(screen));
    });
  };

  const handleLogout = () => {
    closeDrawer();
    requestAnimationFrame(() => {
      void onLogout();
    });
  };

  return (
    <View style={styles.container}>
      <View onLayout={(event) => setHeaderOffset(event.nativeEvent.layout.height)}>
        <ScreenHeader
          variant="title"
          title={getHeaderTitle(activeScreen)}
          showNotifications={false}
          leftAction={
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => setDrawerOpen(true)}
              testID="button-admin-hamburger"
            >
              <Feather name="menu" size={Layout.headerIconSize} color={Colors.light.accent} />
            </Pressable>
          }
          rightAction={
            <View style={styles.headerRight}>
              <Pressable
                style={styles.headerIconBtn}
                onPress={() => onNavigate("Notifications")}
                testID="button-admin-notifications"
              >
                <Feather name="bell" size={Layout.headerIconSize} color={Colors.light.accent} />
              </Pressable>
              <View style={styles.avatarCircle}>
                <ThemedText style={styles.avatarText}>A</ThemedText>
              </View>
            </View>
          }
          testID="admin-screen-header"
        />
      </View>

      <View style={styles.body}>{children}</View>

      {drawerMounted ? (
        <Pressable style={styles.overlay} onPress={closeDrawer} accessibilityLabel="Close menu">
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: "#000000",
                opacity: overlayAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.35],
                }),
              },
            ]}
          />
        </Pressable>
      ) : null}

      {drawerMounted ? (
        <Animated.View
          style={[
            styles.drawer,
            {
              left: slideAnim,
              top: headerOffset,
            },
          ]}
          pointerEvents={drawerOpen ? "auto" : "none"}
        >
          <View style={styles.drawerBody} {...panResponder.panHandlers}>
          <View style={styles.drawerHeader}>
            <View style={styles.drawerAvatarLarge}>
              <ThemedText style={styles.drawerAvatarText}>NG</ThemedText>
            </View>
            <View style={styles.drawerHeaderInfo}>
              <ThemedText
                style={[styles.drawerName, appNameMuted ? styles.drawerNameMuted : undefined]}
              >
                {brandLoading ? "…" : appNameDisplay || "—"}
              </ThemedText>
              <ThemedText style={styles.drawerEmail}>Admin Panel</ThemedText>
            </View>
          </View>

          <View style={styles.drawerDivider} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.drawerItemsContainer}
          >
            {drawerItems.map((item) => {
              const isActive = activeScreen === item.name;
              return (
                <Pressable
                  key={item.name}
                  style={[styles.drawerItem, isActive ? styles.drawerItemActive : null]}
                  onPress={() => handleDrawerNavigate(item.name)}
                  testID={`drawer-${item.name.toLowerCase()}`}
                >
                  <Feather
                    name={item.icon}
                    size={18}
                    color={isActive ? Colors.light.accent : Colors.light.textMuted}
                  />
                  <ThemedText
                    style={[styles.drawerLabel, isActive ? styles.drawerLabelActive : null]}
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
          </View>

          <View style={styles.drawerDivider} />

          <Pressable
            style={[styles.drawerLogout, { paddingBottom: Math.max(insets.bottom, LayoutSpacing.md) }]}
            onPress={handleLogout}
            testID="button-admin-logout"
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <Feather name="log-out" size={18} color={Colors.light.textMuted} />
            <ThemedText style={styles.drawerLogoutText}>Logout</ThemedText>
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
  headerIconBtn: {
    padding: Layout.headerIconPadding,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: LayoutSpacing.xs,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(1, 50, 32, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  body: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  drawer: {
    position: "absolute",
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.light.cardBackground,
    zIndex: 20,
    paddingBottom: LayoutSpacing.lg,
    borderRightWidth: 1,
    borderRightColor: "rgba(0,0,0,0.06)",
  },
  drawerBody: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: LayoutSpacing.lg,
    paddingTop: LayoutSpacing.lg,
    paddingBottom: LayoutSpacing.md,
    gap: LayoutSpacing.sm,
  },
  drawerAvatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(1, 50, 32, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  drawerAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  drawerHeaderInfo: {
    flex: 1,
  },
  drawerName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
  },
  drawerNameMuted: {
    fontStyle: "italic",
    opacity: 0.85,
  },
  drawerEmail: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginHorizontal: LayoutSpacing.md,
    marginVertical: LayoutSpacing.xs,
  },
  drawerItemsContainer: {
    paddingVertical: LayoutSpacing.xs,
    paddingHorizontal: LayoutSpacing.sm,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: LayoutSpacing.md,
    paddingVertical: LayoutSpacing.sm + 2,
    gap: LayoutSpacing.sm,
    borderRadius: 10,
    marginBottom: 2,
  },
  drawerItemActive: {
    backgroundColor: "rgba(1, 50, 32, 0.08)",
  },
  drawerLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.textSecondary,
  },
  drawerLabelActive: {
    color: Colors.light.accent,
    fontWeight: "700",
  },
  drawerLogout: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: LayoutSpacing.lg,
    paddingVertical: LayoutSpacing.md,
    gap: LayoutSpacing.sm,
  },
  drawerLogoutText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.textMuted,
  },
});
