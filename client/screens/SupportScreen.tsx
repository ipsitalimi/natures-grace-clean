import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { fetchSupportCopyMap, formatSupportCopyForDisplay, getSupportCopyKey } from "@/services/content/helpSupportService";

type RootStackParamList = {
  Help: undefined;
  Contact: undefined;
  About: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const supportNavItems = [
  { id: "1", icon: "help-circle" as const, screen: "Help" as const, titleKey: "support_hub_help_title", descKey: "support_hub_help_description" },
  { id: "2", icon: "mail" as const, screen: "Contact" as const, titleKey: "support_hub_contact_title", descKey: "support_hub_contact_description" },
  { id: "3", icon: "info" as const, screen: "About" as const, titleKey: "support_hub_about_title", descKey: "support_hub_about_description" },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [copyMap, setCopyMap] = useState<Record<string, string> | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const loadCopy = useCallback(async () => {
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
      void loadCopy();
    }, [loadCopy])
  );

  const cards = useMemo(
    () =>
      supportNavItems.map((item) => {
        const titleRaw = getSupportCopyKey(copyMap, item.titleKey);
        const descRaw = getSupportCopyKey(copyMap, item.descKey);
        return {
          ...item,
          title: formatSupportCopyForDisplay(titleRaw),
          description: formatSupportCopyForDisplay(descRaw),
          titleMuted: Boolean(copyMap !== null && !titleRaw),
          descMuted: Boolean(copyMap !== null && !descRaw),
        };
      }),
    [copyMap]
  );

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
        <ThemedText style={styles.pageTitle}>Support</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets.bottom, 24) }]}
        showsVerticalScrollIndicator={false}
      >
        {!isSupabaseConfigured() ? (
          <ThemedText style={styles.hintText}>Connect Supabase to sync support hub copy.</ThemedText>
        ) : null}

        {copyLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.light.accent} />
            <ThemedText style={styles.hintText}>Loading…</ThemedText>
          </View>
        ) : null}

        {copyError ? (
          <Pressable onPress={() => void loadCopy()} testID="button-support-copy-retry">
            <ThemedText style={styles.errorText}>{copyError} — tap to retry</ThemedText>
          </Pressable>
        ) : null}

        {cards.map((item) => (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={() => navigation.navigate(item.screen)}
            testID={`button-support-${item.id}`}
          >
            <View style={styles.cardIcon}>
              <Feather name={item.icon} size={22} color={Colors.light.accent} />
            </View>
            <View style={styles.cardContent}>
              <ThemedText style={[styles.cardTitle, item.titleMuted && styles.cardTextMuted]}>{item.title}</ThemedText>
              <ThemedText style={[styles.cardDescription, item.descMuted && styles.cardDescMuted]}>{item.description}</ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.light.textSecondary} />
          </Pressable>
        ))}
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
    gap: 10,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  hintText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: "#8B3A3A",
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  cardTextMuted: {
    color: Colors.light.textSecondary,
    fontStyle: "italic",
  },
  cardDescMuted: {
    fontStyle: "italic",
    opacity: 0.85,
  },
});
