import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

import appLogo from "../../assets/images/natures-grace-logo.png";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
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
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 24) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
          {copyLoading && isSupabaseConfigured() ? (
            <ActivityIndicator color={Colors.light.accent} style={{ marginVertical: Spacing.sm }} />
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

        <View style={styles.card}>
          <ThemedText style={[styles.description, hasLoadedCopy && !introRaw ? styles.aboutMuted : undefined]}>
            {formatSupportCopyForDisplay(introRaw)}
          </ThemedText>
        </View>

        <View style={styles.card}>
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
        </View>

        <View style={styles.badge}>
          <Feather name="award" size={24} color={Colors.light.accent} />
          <ThemedText style={[styles.badgeTitle, hasLoadedCopy && !badgeTitleRaw ? styles.aboutMuted : undefined]}>
            {formatSupportCopyForDisplay(badgeTitleRaw)}
          </ThemedText>
          <ThemedText style={[styles.badgeText, hasLoadedCopy && !badgeBodyRaw ? styles.aboutBadgeMuted : undefined]}>
            {formatSupportCopyForDisplay(badgeBodyRaw)}
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  hint: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  error: {
    fontSize: 14,
    color: "#8B3A3A",
    marginBottom: Spacing.md,
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
  aboutMuted: {
    fontStyle: "italic",
    color: Colors.light.textSecondary,
  },
  aboutBadgeMuted: {
    fontStyle: "italic",
    opacity: 0.85,
  },
});
