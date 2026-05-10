import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const DRAWER_WIDTH = 260;

export type AdminScreenName =
  | "Dashboard"
  | "Users"
  | "Practitioners"
  | "Store"
  | "Community"
  | "Resources"
  | "Prompts"
  | "Analytics"
  | "Notifications"
  | "PromoCodes"
  | "Reviews"
  | "Support"
  | "Settings";

interface DrawerItem {
  name: AdminScreenName;
  icon: keyof typeof Feather.glyphMap;
  label: string;
}

const drawerItems: DrawerItem[] = [
  { name: "Dashboard", icon: "grid", label: "Dashboard" },
  { name: "Users", icon: "users", label: "Users" },
  { name: "Practitioners", icon: "heart", label: "Practitioners" },
  { name: "Store", icon: "shopping-bag", label: "Store Management" },
  { name: "Community", icon: "message-circle", label: "Community" },
  { name: "Resources", icon: "book-open", label: "Resources" },
  { name: "Prompts", icon: "edit-3", label: "Daily Prompts" },
  { name: "Analytics", icon: "bar-chart-2", label: "Analytics" },
  { name: "Notifications", icon: "bell", label: "Notifications" },
  { name: "PromoCodes", icon: "tag", label: "Promo Codes" },
  { name: "Reviews", icon: "star", label: "Reviews" },
  { name: "Support", icon: "help-circle", label: "Support" },
  { name: "Settings", icon: "settings", label: "Settings" },
];

interface AdminLayoutProps {
  activeScreen: AdminScreenName;
  onNavigate: (screen: AdminScreenName) => void;
  onBack: () => void;
  children: React.ReactNode;
}

export default function AdminLayout({
  activeScreen,
  onNavigate,
  onBack,
  children,
}: AdminLayoutProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = 56 + insets.top;
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (drawerOpen) {
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
    } else {
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
      ]).start();
    }
  }, [drawerOpen]);

  const handleDrawerNavigate = (screen: AdminScreenName) => {
    setDrawerOpen(false);
    onNavigate(screen);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { height: headerHeight, paddingTop: insets.top }]}>
        <View style={styles.headerLeft}>
          <Pressable
            style={styles.hamburgerBtn}
            onPress={() => setDrawerOpen(true)}
            testID="button-admin-hamburger"
          >
            <Feather name="menu" size={22} color={Colors.light.cardBackground} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Admin Panel</ThemedText>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.headerIconBtn} testID="button-admin-notifications">
            <View style={styles.bellContainer}>
              <Feather name="bell" size={20} color={Colors.light.cardBackground} />
              <View style={styles.notificationDot} />
            </View>
          </Pressable>
          <View style={styles.avatarCircle}>
            <ThemedText style={styles.avatarText}>A</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.body}>{children}</View>

      {drawerOpen ? (
        <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: overlayAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.4],
                }),
                top: headerHeight,
              },
            ]}
          />
        </TouchableWithoutFeedback>
      ) : null}

      <Animated.View
        style={[
          styles.drawer,
          {
            left: slideAnim,
            top: headerHeight,
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <View style={styles.drawerAvatarLarge}>
            <ThemedText style={styles.drawerAvatarText}>NG</ThemedText>
          </View>
          <View style={styles.drawerHeaderInfo}>
            <ThemedText style={styles.drawerName}>Nature's Grace</ThemedText>
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
                  color={isActive ? "#FFFFFF" : "rgba(255,255,255,0.7)"}
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

        <View style={styles.drawerDivider} />

        <Pressable
          style={styles.drawerLogout}
          onPress={onBack}
          testID="button-admin-logout"
        >
          <Feather name="log-out" size={18} color="rgba(255,255,255,0.7)" />
          <ThemedText style={styles.drawerLogoutText}>Logout</ThemedText>
        </Pressable>
      </Animated.View>
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
    backgroundColor: "#013220",
    paddingHorizontal: Spacing.lg,
    height: 56,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  hamburgerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.cardBackground,
    fontFamily: "Nunito_700Bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerIconBtn: {
    padding: 6,
  },
  bellContainer: {
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E67E22",
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
  },
  body: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    zIndex: 10,
  },
  drawer: {
    position: "absolute",
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#013220",
    zIndex: 20,
    paddingBottom: 20,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 14,
  },
  drawerAvatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  drawerAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
  },
  drawerHeaderInfo: {
    flex: 1,
  },
  drawerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
  },
  drawerEmail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  drawerItemsContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 14,
    borderRadius: 10,
    marginBottom: 2,
  },
  drawerItemActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  drawerLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Nunito_400Regular",
  },
  drawerLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  drawerLogout: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 14,
  },
  drawerLogoutText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Nunito_400Regular",
  },
});
