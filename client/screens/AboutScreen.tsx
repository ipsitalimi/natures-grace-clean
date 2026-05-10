import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

import appLogo from "../../assets/images/natures-grace-logo.png";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications" as never)} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>About</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
          <ThemedText style={styles.appName}>Nature's Grace</ThemedText>
          <ThemedText style={styles.version}>Version 1.0.0</ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.description}>
            Nature's Grace is a holistic wellness platform dedicated to nurturing your mind, body, and spirit. Founded with the vision of making wellness accessible to everyone, we connect you with experienced practitioners, guided practices, and a supportive community.
          </ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Our Mission</ThemedText>
          <ThemedText style={styles.cardText}>
            To create a calm, grounded space where individuals can explore healing modalities, build mindful habits, and find connection on their wellness journey.
          </ThemedText>
        </View>

        <View style={styles.badge}>
          <Feather name="award" size={24} color={Colors.light.accent} />
          <ThemedText style={styles.badgeTitle}>11 Years of Healing</ThemedText>
          <ThemedText style={styles.badgeText}>
            Celebrating over a decade of serving our wellness community with love and dedication.
          </ThemedText>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 8,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerIconButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "600",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  logoContainer: {
    alignItems: "center",
    marginVertical: Spacing.xl,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    marginBottom: 4,
  },
  version: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 23,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.accent,
    marginBottom: Spacing.sm,
  },
  cardText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 23,
  },
  badge: {
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xl,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  badgeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.accent,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  badgeText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
});
