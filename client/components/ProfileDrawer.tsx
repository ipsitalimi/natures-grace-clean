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
  Placeholder: { title: string };
  Settings: undefined;
  SessionHistory: undefined;
  MyReviews: undefined;
  Favorites: undefined;
  PaymentMethods: undefined;
  Support: undefined;
  Notifications: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

function SessionIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.5" />
      <Path d="M8 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M16 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="12" cy="13" r="3" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}

function StarIcon({ size, color }: { size: number; color: string }) {
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

function HeartIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5.08C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.5" />
      <Path
        d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CreditCardIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="1.5" />
      <Path d="M2 10H22" stroke={color} strokeWidth="1.5" />
      <Path d="M6 15H10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function BellIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
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
  badge?: string;
  isSignOut?: boolean;
  onPress?: () => void;
}

function MenuItem({ icon, title, badge, isSignOut, onPress }: MenuItemProps) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>{icon}</View>
      <ThemedText style={[styles.menuTitle, isSignOut && styles.signOutText]}>
        {title}
      </ThemedText>
      {badge ? (
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{badge}</ThemedText>
        </View>
      ) : null}
      <Feather
        name="chevron-right"
        size={18}
        color={isSignOut ? "#D4534A" : Colors.light.textSecondary}
      />
    </Pressable>
  );
}

interface ProfileDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ visible, onClose }: ProfileDrawerProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const navigateTo = (title: string) => {
    onClose();
    setTimeout(() => {
      navigation.navigate("Placeholder", { title });
    }, 250);
  };

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
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
        >
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
            <ThemedText style={styles.userName}>Limi</ThemedText>
            <ThemedText style={styles.userEmail}>limi@email.com</ThemedText>
            <View style={styles.bioContainer}>
              <ThemedText style={styles.userBio}>
                On a journey of inner peace and healing.
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Session History</ThemedText>
            <MenuItem
              icon={<SessionIcon size={20} color={Colors.light.accent} />}
              title="Session History"
              onPress={() => {
                onClose();
                setTimeout(() => {
                  navigation.navigate("SessionHistory" as never);
                }, 250);
              }}
            />
            <MenuItem
              icon={<StarIcon size={20} color={Colors.light.accent} />}
              title="My Reviews"
              onPress={() => {
                onClose();
                setTimeout(() => {
                  navigation.navigate("MyReviews" as never);
                }, 250);
              }}
            />
            <MenuItem
              icon={<HeartIcon size={20} color={Colors.light.accent} />}
              title="Favorites"
              onPress={() => {
                onClose();
                setTimeout(() => {
                  navigation.navigate("Favorites" as never);
                }, 250);
              }}
            />
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
            <MenuItem
              icon={<UserIcon size={20} color={Colors.light.accent} />}
              title="Account Info"
              onPress={() => {
                onClose();
                setTimeout(() => {
                  navigation.navigate("Settings" as never);
                }, 250);
              }}
            />
            <MenuItem
              icon={<CreditCardIcon size={20} color={Colors.light.accent} />}
              title="Payment Methods"
              badge="2"
              onPress={() => {
                onClose();
                setTimeout(() => {
                  navigation.navigate("PaymentMethods" as never);
                }, 250);
              }}
            />
            <MenuItem
              icon={<BellIcon size={20} color={Colors.light.accent} />}
              title="Notifications"
              onPress={() => {
                onClose();
                setTimeout(() => {
                  navigation.navigate("Notifications" as never);
                }, 250);
              }}
            />
            <MenuItem
              icon={<HelpIcon size={20} color={Colors.light.accent} />}
              title="Support"
              onPress={() => {
                onClose();
                setTimeout(() => {
                  navigation.navigate("Support" as never);
                }, 250);
              }}
            />
          </View>

          <View style={styles.signOutSection}>
            <MenuItem
              icon={<Feather name="log-out" size={20} color="#D4534A" />}
              title="Sign Out"
              isSignOut
              onPress={() => navigateTo("Sign Out")}
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
  badge: {
    backgroundColor: Colors.light.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.light.brown,
    fontWeight: "500",
  },
  signOutSection: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: Colors.light.brownLight,
    paddingTop: 12,
  },
});
