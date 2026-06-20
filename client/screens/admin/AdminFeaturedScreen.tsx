import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { formatInr } from "@/lib/formatCurrency";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { useDataContext } from "@/context/DataContext";

export default function AdminFeaturedScreen({
  onBackToDashboard,
}: {
  onBackToDashboard: () => void;
}) {
  const { homeContent, updateHomeContent } = usePlatformConfig();
  const { practitionerCategories, storeCategories, updatePractitionerMeta } = useDataContext();
  const allPractitioners = practitionerCategories.flatMap((c) => c.practitioners);
  const allProducts = storeCategories.flatMap((c) => c.products);
  const [newAffirmation, setNewAffirmation] = useState("");
  const [saved, setSaved] = useState(false);

  const showSavedFeedback = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleFeaturedPractitioner = (id: string) => {
    const ids = homeContent.featuredPractitionerIds;
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(0, 6);
    updateHomeContent({ featuredPractitionerIds: next });
    updatePractitionerMeta(id, { featured: !ids.includes(id) });
    showSavedFeedback();
  };

  const toggleFeaturedProduct = (id: string) => {
    const ids = homeContent.featuredProductIds;
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(0, 8);
    updateHomeContent({ featuredProductIds: next });
    showSavedFeedback();
  };

  const addAffirmation = () => {
    if (!newAffirmation.trim()) return;
    updateHomeContent({
      affirmations: [...homeContent.affirmations, newAffirmation.trim()],
    });
    setNewAffirmation("");
    showSavedFeedback();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard}>
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Featured & Homepage</ThemedText>
      </View>

      <ThemedText style={styles.subTitle}>Global banner</ThemedText>
      <View style={styles.card}>
        <View style={styles.row}>
          <ThemedText style={styles.label}>Show banner on home</ThemedText>
          <Switch
            value={homeContent.globalBanner.enabled}
            onValueChange={(v) =>
              updateHomeContent({ globalBanner: { ...homeContent.globalBanner, enabled: v } })
            }
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Banner message"
          value={homeContent.globalBanner.message}
          onChangeText={(message) =>
            updateHomeContent({ globalBanner: { ...homeContent.globalBanner, message } })
          }
        />
      </View>

      <ThemedText style={styles.subTitle}>Welcome copy</ThemedText>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={homeContent.welcomeName}
          onChangeText={(welcomeName) => updateHomeContent({ welcomeName })}
          placeholder="Welcome name"
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          value={homeContent.breathingMessage}
          onChangeText={(breathingMessage) => updateHomeContent({ breathingMessage })}
          placeholder="Breathing message"
          multiline
        />
      </View>

      <ThemedText style={styles.subTitle}>Home action cards</ThemedText>
      <View style={styles.card}>
        {(Object.keys(homeContent.actionCards) as Array<keyof typeof homeContent.actionCards>).map(
          (key) => (
            <View key={key} style={styles.row}>
              <ThemedText style={styles.label}>{key}</ThemedText>
              <Switch
                value={homeContent.actionCards[key]}
                onValueChange={(v) =>
                  updateHomeContent({
                    actionCards: { ...homeContent.actionCards, [key]: v },
                  })
                }
              />
            </View>
          )
        )}
      </View>

      <ThemedText style={styles.subTitle}>Daily affirmations</ThemedText>
      <View style={styles.card}>
        {homeContent.affirmations.map((text, index) => (
          <ThemedText key={`${index}-${text.slice(0, 12)}`} style={styles.affirmationItem}>
            {text}
          </ThemedText>
        ))}
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={newAffirmation}
            onChangeText={setNewAffirmation}
            placeholder="New affirmation"
          />
          <Pressable style={styles.addBtn} onPress={addAffirmation}>
            <Feather name="plus" size={18} color="#FFF" />
          </Pressable>
        </View>
      </View>

      <ThemedText style={styles.subTitle}>Featured practitioners (home carousel)</ThemedText>
      {allPractitioners.length === 0 ? (
        <View style={styles.emptyCard}>
          <ThemedText style={styles.emptyText}>No practitioners available to feature.</ThemedText>
        </View>
      ) : (
        allPractitioners.map((p) => {
        const selected = homeContent.featuredPractitionerIds.includes(p.id);
        const verified = p.isVerified;
        return (
          <Pressable
            key={p.id}
            style={[styles.selectRow, selected && styles.selectRowActive]}
            onPress={() => toggleFeaturedPractitioner(p.id)}
          >
            <ThemedText style={styles.selectName}>{p.name}</ThemedText>
            <ThemedText style={styles.selectMeta}>
              {selected ? "Featured" : "Tap to feature"}
              {verified ? " · Verified" : ""}
            </ThemedText>
          </Pressable>
        );
      })
      )}

      <ThemedText style={styles.subTitle}>Featured store products</ThemedText>
      {allProducts.length === 0 ? (
        <View style={styles.emptyCard}>
          <ThemedText style={styles.emptyText}>No store products available to feature.</ThemedText>
        </View>
      ) : (
        allProducts.map((p) => {
        const selected = homeContent.featuredProductIds.includes(p.id);
        return (
          <Pressable
            key={p.id}
            style={[styles.selectRow, selected && styles.selectRowActive]}
            onPress={() => toggleFeaturedProduct(p.id)}
          >
            <ThemedText style={styles.selectName}>{p.name}</ThemedText>
            <ThemedText style={styles.selectMeta}>
              {selected ? "Featured" : "Tap to feature"} · {formatInr(p.price)}
            </ThemedText>
          </Pressable>
        );
      })
      )}

      {saved ? (
        <View style={styles.savedBanner}>
          <ThemedText style={styles.savedBannerText}>Saved — visible on home now</ThemedText>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: Spacing.lg, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.lg },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  subTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.textSecondary,
    marginBottom: 8,
    marginTop: 8,
    fontFamily: "Nunito_700Bold",
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.divider,
    borderRadius: BorderRadius.sm,
    padding: 10,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  affirmationItem: { fontSize: 13, color: Colors.light.textSecondary, marginBottom: 4 },
  addRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#013220",
    alignItems: "center",
    justifyContent: "center",
  },
  selectRow: {
    padding: 12,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.cardBackground,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  selectRowActive: { borderColor: "#013220", backgroundColor: "#E8F5EE" },
  selectName: { fontSize: 15, fontWeight: "600", fontFamily: "Nunito_600SemiBold" },
  selectMeta: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  saveButton: {
    backgroundColor: "#013220",
    padding: 14,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  saveButtonText: { color: "#FFF", fontWeight: "700", fontFamily: "Nunito_700Bold" },
  savedBanner: {
    backgroundColor: "#E8F5EE",
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  savedBannerText: {
    color: "#013220",
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  emptyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
