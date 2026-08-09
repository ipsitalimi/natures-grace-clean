import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";

type RootStackParamList = {
  MainTabs: undefined;
  Placeholder: { title: string };
};

export default function PlaceholderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Placeholder">>();
  const title = route.params?.title || "Coming Soon";
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 2C12 2 8 6 8 10C8 14 12 16 12 16C12 16 16 14 16 10C16 6 12 2 12 2Z"
              fill={Colors.light.accent}
              opacity={0.3}
            />
            <Path
              d="M6 8C6 8 2 10 2 14C2 18 6 20 6 20C6 20 8 18 8 14C8 10 6 8 6 8Z"
              fill={Colors.light.accent}
              opacity={0.2}
            />
            <Path
              d="M18 8C18 8 22 10 22 14C22 18 18 20 18 20C18 20 16 18 16 14C16 10 18 8 18 8Z"
              fill={Colors.light.accent}
              opacity={0.2}
            />
          </Svg>
        </View>

        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.subtitle}>
          This feature is coming soon. We're working on something beautiful for you.
        </ThemedText>

        <Pressable style={styles.backHomeButton} onPress={() => navigation.goBack()}>
          <ThemedText style={styles.backHomeText}>Go Back</ThemedText>
          <Feather name="arrow-left" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: 6,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: 80,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    textAlign: "center",
    marginBottom: Spacing.md,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing["2xl"],
  },
  backHomeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  backHomeText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "500",
  },
});
