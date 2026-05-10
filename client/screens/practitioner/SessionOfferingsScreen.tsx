import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { offeringsStore, type SessionOffering } from "@/data/sessionOfferingsStore";

function getDurationLabel(minutes: number): string {
  if (minutes === 60) return "1 hour";
  return `${minutes} min`;
}

function getTypeColor(type: string): { bg: string; text: string } {
  switch (type) {
    case "Healing":
      return { bg: "#A8D8EA33", text: "#3A7CA5" };
    case "Counseling":
      return { bg: "#C3E6CB33", text: "#4A7C59" };
    case "Spiritual Guidance":
      return { bg: "#E8D5B733", text: "#8B6F47" };
    case "Therapy":
      return { bg: "#F3D1DC33", text: "#9B5C73" };
    case "Nutrition":
      return { bg: "#FDEBD033", text: "#B8860B" };
    case "Financial Guidance":
      return { bg: "#D5C4E833", text: "#6B5B8D" };
    default:
      return { bg: "rgba(1,50,32,0.08)", text: Colors.light.accent };
  }
}

export default function SessionOfferingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [offerings, setOfferings] = useState<SessionOffering[]>(offeringsStore.getOfferings());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (isFocused) {
      setOfferings(offeringsStore.getOfferings());
    }
  }, [isFocused]);

  useEffect(() => {
    const unsub = offeringsStore.subscribe(() => {
      setOfferings(offeringsStore.getOfferings());
    });
    return unsub;
  }, []);

  const handleDelete = (id: string) => {
    offeringsStore.deleteOffering(id);
    setDeleteConfirm(id);
    setTimeout(() => setDeleteConfirm(null), 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={20} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Session Offerings</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.addButton}
          onPress={() => (navigation as any).navigate("AddEditOffering", { offeringId: null })}
          testID="button-add-offering"
        >
          <View style={styles.addIconCircle}>
            <Feather name="plus" size={18} color="#FFFFFF" />
          </View>
          <ThemedText style={styles.addButtonText}>Add Session Offering</ThemedText>
        </Pressable>

        <ThemedText style={styles.sectionSubtitle}>
          Define what users will see when booking sessions with you.
        </ThemedText>

        {offerings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="inbox" size={32} color={Colors.light.textMuted} />
            <ThemedText style={styles.emptyText}>No offerings yet</ThemedText>
            <ThemedText style={styles.emptyHint}>
              Tap the button above to create your first session offering.
            </ThemedText>
          </View>
        ) : null}

        {offerings.map((offering) => {
          const tc = getTypeColor(offering.sessionType);
          return (
            <View key={offering.id} style={styles.offeringCard} testID={`offering-card-${offering.id}`}>
              <View style={styles.cardTopRow}>
                <View style={[styles.typeBadge, { backgroundColor: tc.bg }]}>
                  <ThemedText style={[styles.typeBadgeText, { color: tc.text }]}>
                    {offering.sessionType}
                  </ThemedText>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.editIconBtn}
                    onPress={() =>
                      (navigation as any).navigate("AddEditOffering", { offeringId: offering.id })
                    }
                    testID={`button-edit-${offering.id}`}
                  >
                    <Feather name="edit-2" size={15} color={Colors.light.accent} />
                  </Pressable>
                  <Pressable
                    style={styles.deleteIconBtn}
                    onPress={() => handleDelete(offering.id)}
                    testID={`button-delete-${offering.id}`}
                  >
                    <Feather name="trash-2" size={15} color="#8B3A3A" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Feather name="clock" size={14} color={Colors.light.textMuted} />
                  <ThemedText style={styles.detailText}>
                    {getDurationLabel(offering.duration)}
                  </ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.priceSymbol}>&#8377;</ThemedText>
                  <ThemedText style={styles.priceText}>
                    {offering.price.toLocaleString()}
                  </ThemedText>
                </View>
              </View>

              {offering.notes ? (
                <ThemedText style={styles.notesText} numberOfLines={2}>
                  {offering.notes}
                </ThemedText>
              ) : null}
            </View>
          );
        })}

        {deleteConfirm ? (
          <View style={styles.deleteBanner}>
            <Feather name="check-circle" size={14} color="#8B3A3A" />
            <ThemedText style={styles.deleteBannerText}>Offering removed</ThemedText>
          </View>
        ) : null}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  addIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginBottom: Spacing.xl,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing["3xl"],
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
  },
  offeringCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  typeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
  },
  cardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  editIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(1, 50, 32, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(139, 58, 58, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardDetails: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  priceSymbol: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  priceText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  notesText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    lineHeight: 18,
  },
  deleteBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 58, 58, 0.08)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  deleteBannerText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#8B3A3A",
  },
});
