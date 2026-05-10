import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";

type RootStackParamList = {
  SessionHistory: undefined;
  Settings: undefined;
  Support: undefined;
  Login: undefined;
  ProductListings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

function HistoryIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.5" />
      <Path d="M8 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M16 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="12" cy="13" r="3" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}

function ListingsIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HelpIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />
      <Path
        d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="17" r="1" fill={color} />
    </Svg>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  isSignOut?: boolean;
  onPress?: () => void;
}

function MenuItem({ icon, title, isSignOut, onPress }: MenuItemProps) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>{icon}</View>
      <ThemedText style={[styles.menuTitle, isSignOut && styles.signOutText]}>
        {title}
      </ThemedText>
      <Feather
        name="chevron-right"
        size={18}
        color={isSignOut ? "#D4534A" : Colors.light.textSecondary}
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
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible) return null;

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
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={24} color={Colors.light.text} />
            </Pressable>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
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
            </View>
            <ThemedText style={styles.userName}>Priya Sharma</ThemedText>
            <ThemedText style={styles.userEmail}>seller@naturesgrace.com</ThemedText>
            <View style={styles.bioContainer}>
              <ThemedText style={styles.userBio}>
                Nature's Grace Store Partner
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Store History</ThemedText>
            <MenuItem
              icon={<HistoryIcon size={20} color={Colors.light.accent} />}
              title="Store History"
              onPress={() => {
                onClose();
                setTimeout(() => navigation.navigate("SessionHistory" as never), 250);
              }}
            />
            <MenuItem
              icon={<ListingsIcon size={20} color={Colors.light.accent} />}
              title="My Listings"
              onPress={() => {
                onClose();
                setTimeout(() => navigation.navigate("ProductListings" as never), 250);
              }}
            />
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
            <MenuItem
              icon={<Feather name="settings" size={20} color={Colors.light.accent} />}
              title="Settings"
              onPress={() => {
                onClose();
                setTimeout(() => navigation.navigate("Settings" as never), 250);
              }}
            />
            <MenuItem
              icon={<HelpIcon size={20} color={Colors.light.accent} />}
              title="Support"
              onPress={() => {
                onClose();
                setTimeout(() => navigation.navigate("Support" as never), 250);
              }}
            />
          </View>

          <View style={styles.signOutSection}>
            <MenuItem
              icon={<Feather name="log-out" size={20} color="#D4534A" />}
              title="Sign Out"
              isSignOut
              onPress={() => {
                onClose();
                setTimeout(() => {
                  (navigation as any).reset({ index: 0, routes: [{ name: "Login" }] });
                }, 250);
              }}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
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
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  closeButton: {
    padding: 4,
  },
  profileSection: {
    alignItems: "center",
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.brownLight,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.light.accent}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginBottom: 10,
  },
  bioContainer: {
    backgroundColor: Colors.light.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  userBio: {
    fontSize: 13,
    color: Colors.light.text,
    fontStyle: "italic",
    textAlign: "center",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
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
    color: Colors.light.text,
  },
  signOutText: {
    color: "#D4534A",
  },
  signOutSection: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: Colors.light.brownLight,
    paddingTop: 12,
  },
});
