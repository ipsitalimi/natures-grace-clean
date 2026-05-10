import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import logoImage from "../../assets/images/natures-grace-logo.png";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onProfilePress?: () => void;
}

export default function AppHeader({ title, showBack = false, onProfilePress }: AppHeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.leftSection}>
        {showBack ? (
          <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
        ) : (
          <Pressable style={styles.iconButton} onPress={onProfilePress} testID="button-profile">
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="8" r="4" fill={Colors.light.accent} opacity={0.8} />
              <Path
                d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20"
                stroke={Colors.light.accent}
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Pressable>
        )}
      </View>

      {title ? (
        <ThemedText style={styles.title}>{title}</ThemedText>
      ) : (
        <Image
          source={logoImage}
          style={styles.centerLogo}
          resizeMode="contain"
        />
      )}

      <View style={styles.rightSection}>
        <Pressable style={styles.iconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 8,
    backgroundColor: Colors.light.backgroundRoot,
  },
  leftSection: {
    width: 80,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  centerLogo: {
    width: 52,
    height: 52,
  },
  rightSection: {
    width: 80,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  iconButton: {
    padding: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "500",
    color: Colors.light.text,
    textAlign: "center",
    flex: 1,
  },
});
