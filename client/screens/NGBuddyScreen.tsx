import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Ellipse } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

function BuddyIllustration() {
  return (
    <Svg width={160} height={160} viewBox="0 0 160 160" fill="none">
      <Circle cx="80" cy="80" r="72" fill={Colors.light.cardBackground} />
      <Circle cx="80" cy="80" r="72" fill={Colors.light.accent} opacity={0.06} />

      <Circle cx="80" cy="68" r="26" fill={Colors.light.accent} opacity={0.12} />
      <Circle cx="80" cy="68" r="18" fill={Colors.light.accent} opacity={0.2} />

      <Circle cx="72" cy="64" r="3" fill={Colors.light.accent} opacity={0.7} />
      <Circle cx="88" cy="64" r="3" fill={Colors.light.accent} opacity={0.7} />

      <Path
        d="M72 74 Q80 80 88 74"
        stroke={Colors.light.accent}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity={0.8}
      />

      <Path
        d="M80 46 L80 40"
        stroke={Colors.light.accent}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.5}
      />
      <Circle cx="80" cy="37" r="2" fill={Colors.light.accent} opacity={0.4} />

      <Path
        d="M58 62 L50 56"
        stroke={Colors.light.accent}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.4}
      />
      <Path
        d="M102 62 L110 56"
        stroke={Colors.light.accent}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.4}
      />

      <Ellipse cx="52" cy="54" rx="5" ry="4" fill={Colors.light.accent} opacity={0.15} />
      <Ellipse cx="108" cy="54" rx="5" ry="4" fill={Colors.light.accent} opacity={0.15} />

      <Path
        d="M56 96 Q80 112 104 96"
        stroke={Colors.light.accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="4 3"
        fill="none"
        opacity={0.3}
      />

      <Path
        d="M96 50 Q106 42 116 50 Q106 58 96 50Z"
        fill={Colors.light.accent}
        opacity={0.12}
      />
    </Svg>
  );
}

export default function NGBuddyScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Pressable
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        testID="button-back"
      >
        <Feather name="arrow-left" size={22} color={Colors.light.accent} />
      </Pressable>

      <View style={styles.content}>
        <View style={styles.illustrationWrap}>
          <BuddyIllustration />
          <View style={styles.sparkle1} />
          <View style={styles.sparkle2} />
          <View style={styles.sparkle3} />
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>Coming Soon</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.title}>NG Buddy</ThemedText>
        <ThemedText style={styles.subtitle}>Your Personal Wellness Companion</ThemedText>

        <View style={styles.divider} />

        <ThemedText style={styles.description}>
          NG Buddy is your always-available AI companion — here to listen, reflect with you, and guide you gently through whatever you are feeling.
        </ThemedText>

        <View style={styles.featuresCard}>
          <FeatureRow icon="message-circle" text="Mindful conversations, anytime" />
          <FeatureRow icon="heart" text="Mood-aware emotional support" />
          <FeatureRow icon="sun" text="Personalized wellness guidance" />
          <FeatureRow icon="shield" text="Private and judgment-free space" />
        </View>

        <ThemedText style={styles.notifyText}>
          We are preparing something beautiful for you.
        </ThemedText>
      </View>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Feather name={icon as any} size={14} color={Colors.light.accent} />
      </View>
      <ThemedText style={styles.featureText}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  backButton: {
    padding: 12,
    paddingLeft: Spacing.lg,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
    paddingBottom: Spacing["2xl"],
  },
  illustrationWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  sparkle1: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.accent,
    opacity: 0.25,
  },
  sparkle2: {
    position: "absolute",
    bottom: 20,
    left: 8,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.light.accent,
    opacity: 0.18,
  },
  sparkle3: {
    position: "absolute",
    top: 30,
    left: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.brown,
    opacity: 0.2,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.light.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    opacity: 0.85,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontFamily: "ui-serif",
    fontWeight: "700",
    color: Colors.light.accent,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: Colors.light.accent,
    borderRadius: 1,
    opacity: 0.3,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 14,
    color: Colors.light.text,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
    opacity: 0.85,
  },
  featuresCard: {
    width: "100%",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.accent,
    opacity: 0.9,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 13,
    color: Colors.light.text,
    fontFamily: "Nunito_400Regular",
    opacity: 0.9,
  },
  notifyText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    fontStyle: "italic",
  },
});
