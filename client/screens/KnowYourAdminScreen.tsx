import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";

const expertiseItems = [
  { icon: "sun", label: "Reiki Grandmaster & Advanced Su-Jok Therapist" },
  { icon: "star", label: "Switchwords Expert & Tarot Reader" },
  { icon: "heart", label: "Animal Healer & Naturopathy Practitioner" },
  { icon: "award", label: "Positivity & Holistic Wellness Coach" },
];

function LotusDecor({ size = 48, color = Colors.light.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M24 4C24 4 16 12 16 20C16 28 24 32 24 32C24 32 32 28 32 20C32 12 24 4 24 4Z"
        fill={color}
        opacity={0.7}
      />
      <Path
        d="M12 16C12 16 4 20 4 28C4 36 12 40 12 40C12 40 16 36 16 28C16 20 12 16 12 16Z"
        fill={color}
        opacity={0.5}
      />
      <Path
        d="M36 16C36 16 44 20 44 28C44 36 36 40 36 40C36 40 32 36 32 28C32 20 36 16 36 16Z"
        fill={color}
        opacity={0.5}
      />
    </Svg>
  );
}

export default function KnowYourAdminScreen() {
  const { scrollPaddingBottom } = useLayoutInsets(32);

  return (
    <View style={styles.container}>
      <BackHeader />

      <BelowHeaderTitle>Know Your Admin</BelowHeaderTitle>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <LotusDecor size={48} color={Colors.light.accent} />
            </View>
          </View>
          <ThemedText style={styles.name}>Dr. Neelam Parwani</ThemedText>
          <ThemedText style={styles.title}>Holistic Health Expert</ThemedText>
          <View style={styles.experienceBadge}>
            <Feather name="award" size={14} color={Colors.light.accent} />
            <ThemedText style={styles.experienceText}>11+ Years of Experience</ThemedText>
          </View>
        </View>

        <View style={styles.aboutCard}>
          <ThemedText style={styles.sectionTitle}>About</ThemedText>
          <ThemedText style={styles.aboutText}>
            With over 11 years of experience, Dr. Neelam Parwani is the founder of Nature's Grace, a practice dedicated to providing effective health solutions without medicines or side effects. Operating out of Jaipur and Gurgaon, she specializes in a multi-disciplinary approach to wellness.
          </ThemedText>
        </View>

        <View style={styles.expertiseCard}>
          <ThemedText style={styles.sectionTitle}>Core Expertise</ThemedText>
          {expertiseItems.map((item, index) => (
            <View key={index} style={styles.expertiseItem}>
              <View style={styles.expertiseIconWrap}>
                <Feather name={item.icon as any} size={16} color={Colors.light.accent} />
              </View>
              <ThemedText style={styles.expertiseLabel}>{item.label}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Feather name="map-pin" size={16} color={Colors.light.accent} />
            <ThemedText style={styles.locationTitle}>Locations</ThemedText>
          </View>
          <View style={styles.locationTags}>
            <View style={styles.locationTag}>
              <ThemedText style={styles.locationTagText}>Jaipur</ThemedText>
            </View>
            <View style={styles.locationTag}>
              <ThemedText style={styles.locationTagText}>Gurgaon</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.missionCard}>
          <View style={styles.missionIconWrap}>
            <Feather name="target" size={20} color={Colors.light.accent} />
          </View>
          <ThemedText style={styles.missionTitle}>The Mission</ThemedText>
          <ThemedText style={styles.missionText}>
            To empower individuals through holistic awareness and natural healing products that restore balance to mind, body, and spirit.
          </ThemedText>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <LotusDecor size={24} color={Colors.light.brownLight} />
          <View style={styles.dividerLine} />
        </View>

        <ThemedText style={styles.footerText}>
          "Healing begins when you choose yourself."
        </ThemedText>
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
    gap: 16,
  },
  profileCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: 24,
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.light.backgroundRoot,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.light.accent,
  },
  name: {
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 4,
    textAlign: "center",
  },
  title: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.accent,
    marginBottom: 12,
    textAlign: "center",
  },
  experienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  experienceText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  aboutCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  expertiseCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: 20,
  },
  expertiseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundRoot,
  },
  expertiseIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.light.backgroundRoot,
    justifyContent: "center",
    alignItems: "center",
  },
  expertiseLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    lineHeight: 20,
  },
  locationCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: 20,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  locationTags: {
    flexDirection: "row",
    gap: 10,
  },
  locationTag: {
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.accent,
  },
  locationTagText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  missionCard: {
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.lg,
    padding: 24,
    alignItems: "center",
  },
  missionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  missionTitle: {
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  missionText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 22,
    textAlign: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.brownLight,
  },
  footerText: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    fontStyle: "italic",
    color: Colors.light.brown,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
});
