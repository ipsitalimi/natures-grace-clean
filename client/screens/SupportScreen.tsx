import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout, Card } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors } from "@/constants/theme";
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
    <PageLayout title="Support" titleInHeader header="back" contentContainerStyle={styles.content}>
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
        <Card
          key={item.id}
          onPress={() => navigation.navigate(item.screen)}
          testID={`button-support-${item.id}`}
        >
          <View style={styles.cardRow}>
            <View style={styles.cardIcon}>
              <Feather name={item.icon} size={22} color={Colors.light.accent} />
            </View>
            <View style={styles.cardContent}>
              <ThemedText style={[styles.cardTitle, item.titleMuted && styles.cardTextMuted]}>{item.title}</ThemedText>
              <ThemedText style={[styles.cardDescription, item.descMuted && styles.cardDescMuted]}>{item.description}</ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.light.textSecondary} />
          </View>
        </Card>
      ))}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: LayoutSpacing.sm,
    paddingTop: LayoutSpacing.xs,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: LayoutSpacing.sm,
    marginBottom: LayoutSpacing.sm,
  },
  hintText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: LayoutSpacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: "#8B3A3A",
    marginBottom: LayoutSpacing.sm,
  },
  cardRow: {
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
    marginRight: LayoutSpacing.md,
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
