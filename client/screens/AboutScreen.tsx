import React, { useCallback, useState } from "react";
import { View, StyleSheet, Pressable, Image, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout, Card } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";

import appLogo from "../../assets/images/natures-grace-logo.png";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import {
  ABOUT_APP_NAME_KEY,
  ABOUT_APP_VERSION_KEY,
  ABOUT_MISSION_SECTION_TITLE_KEY,
  fetchSupportCopyMap,
  formatSupportCopyForDisplay,
  formatSupportCopyLabel,
  getSupportCopyKey,
} from "@/services/content/helpSupportService";

export default function AboutScreen() {
  const [copyMap, setCopyMap] = useState<Record<string, string> | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const loadAboutCopy = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCopyMap(null);
      setCopyLoading(false);
      setCopyError(null);
      return;
    }
    setCopyLoading(true);
    setCopyError(null);
    const res = await fetchSupportCopyMap();
    setCopyLoading(false);
    if (!res.ok) {
      setCopyError(res.error);
      setCopyMap(null);
      return;
    }
    setCopyMap(res.map);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAboutCopy();
    }, [loadAboutCopy])
  );

  const appNameRaw = getSupportCopyKey(copyMap, ABOUT_APP_NAME_KEY);
  const versionRaw = getSupportCopyKey(copyMap, ABOUT_APP_VERSION_KEY);
  const introRaw = getSupportCopyKey(copyMap, "about_intro");
  const missionTitleRaw = getSupportCopyKey(copyMap, ABOUT_MISSION_SECTION_TITLE_KEY);
  const missionRaw = getSupportCopyKey(copyMap, "about_mission");
  const badgeTitleRaw = getSupportCopyKey(copyMap, "about_badge_title");
  const badgeBodyRaw = getSupportCopyKey(copyMap, "about_badge_text");
  const hasLoadedCopy = Boolean(copyMap !== null && !copyLoading && !copyError && isSupabaseConfigured());

  return (
    <PageLayout title="About" titleInHeader header="back" contentContainerStyle={styles.content}>
      <View style={styles.logoContainer}>
        <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
        {copyLoading && isSupabaseConfigured() ? (
          <ActivityIndicator color={Colors.light.accent} style={{ marginVertical: LayoutSpacing.sm }} />
        ) : (
          <>
            <ThemedText
              style={[styles.appName, hasLoadedCopy && !appNameRaw ? styles.aboutMuted : undefined]}
              testID="text-about-app-name"
            >
              {isSupabaseConfigured()
                ? formatSupportCopyForDisplay(appNameRaw)
                : formatSupportCopyForDisplay("")}
            </ThemedText>
            <ThemedText
              style={[styles.version, hasLoadedCopy && !versionRaw ? styles.aboutMuted : undefined]}
              testID="text-about-app-version"
            >
              {isSupabaseConfigured()
                ? formatSupportCopyForDisplay(versionRaw)
                : formatSupportCopyForDisplay("")}
            </ThemedText>
          </>
        )}
      </View>

      {!isSupabaseConfigured() ? (
        <ThemedText style={styles.hint}>Connect Supabase for editable About copy.</ThemedText>
      ) : null}

      {copyLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.hint}>Loading…</ThemedText>
        </View>
      ) : null}

      {copyError ? (
        <Pressable onPress={() => void loadAboutCopy()} testID="button-about-retry">
          <ThemedText style={styles.error}>{copyError} — tap to retry</ThemedText>
        </Pressable>
      ) : null}

      <Card style={styles.cardSpacing}>
        <ThemedText style={[styles.description, hasLoadedCopy && !introRaw ? styles.aboutMuted : undefined]}>
          {formatSupportCopyForDisplay(introRaw)}
        </ThemedText>
      </Card>

      <Card style={styles.cardSpacing}>
        <ThemedText
          style={[styles.cardTitle, hasLoadedCopy && !missionTitleRaw ? styles.aboutMuted : undefined]}
          testID="text-about-mission-heading"
        >
          {isSupabaseConfigured()
            ? formatSupportCopyLabel(missionTitleRaw, { showEmpty: hasLoadedCopy })
            : formatSupportCopyForDisplay("")}
        </ThemedText>
        <ThemedText style={[styles.cardText, hasLoadedCopy && !missionRaw ? styles.aboutMuted : undefined]}>
          {formatSupportCopyForDisplay(missionRaw)}
        </ThemedText>
      </Card>

      <View style={styles.badge}>
        <Feather name="award" size={24} color={Colors.light.accent} />
        <ThemedText style={[styles.badgeTitle, hasLoadedCopy && !badgeTitleRaw ? styles.aboutMuted : undefined]}>
          {formatSupportCopyForDisplay(badgeTitleRaw)}
        </ThemedText>
        <ThemedText style={[styles.badgeText, hasLoadedCopy && !badgeBodyRaw ? styles.aboutBadgeMuted : undefined]}>
          {formatSupportCopyForDisplay(badgeBodyRaw)}
        </ThemedText>
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: LayoutSpacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: LayoutSpacing.sm,
    marginBottom: LayoutSpacing.md,
  },
  hint: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: LayoutSpacing.md,
  },
  error: {
    fontSize: 14,
    color: "#8B3A3A",
    marginBottom: LayoutSpacing.md,
  },
  logoContainer: {
    alignItems: "center",
    marginVertical: LayoutSpacing.xl,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: LayoutSpacing.md,
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    marginBottom: LayoutSpacing.xs,
  },
  version: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  cardSpacing: {
    marginBottom: LayoutSpacing.sm,
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
    marginBottom: LayoutSpacing.sm,
  },
  cardText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 23,
  },
  badge: {
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.sm,
    padding: LayoutSpacing.xl,
    alignItems: "center",
    marginTop: LayoutSpacing.sm,
  },
  badgeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.accent,
    marginTop: LayoutSpacing.sm,
    marginBottom: LayoutSpacing.xs,
  },
  badgeText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
  aboutMuted: {
    fontStyle: "italic",
    color: Colors.light.textSecondary,
  },
  aboutBadgeMuted: {
    fontStyle: "italic",
    opacity: 0.85,
  },
});
