import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BackHeader, BelowHeaderTitle } from "@/components/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { LayoutSpacing } from "@/constants/layout";
import type { SessionOffering } from "@/data/practitionerBookings";
import { usePractitionerContext } from "@/context/PractitionerContext";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";

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
  const { scrollPaddingBottom } = useLayoutInsets(30);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const { offerings, deleteOffering, refresh, loading } = usePractitionerContext();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (isFocused) refresh();
  }, [isFocused, refresh]);

  const handleDelete = (id: string) => {
    setDeleteError(null);
    setPendingDeleteId(id);
  };

  const confirmDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      const removed = await deleteOffering(id);
      if (!removed) {
        setDeleteError("Could not remove this offering. Check your practitioner access and try again.");
        return;
      }
      setPendingDeleteId(null);
      setDeleteConfirm(id);
    } catch (error) {
      console.error("[SessionOfferings] delete failed:", error);
      setDeleteError("Could not remove this offering. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <BackHeader showNotifications={false} />
      <BelowHeaderTitle>Session Offerings</BelowHeaderTitle>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.light.accent} />
            <ThemedText style={styles.loadingText}>Loading offerings…</ThemedText>
          </View>
        ) : null}

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
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${offering.sessionType} offering`}
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

              {pendingDeleteId === offering.id ? (
                <View style={styles.deleteConfirmRow} testID={`delete-confirm-${offering.id}`}>
                  <ThemedText style={styles.deleteConfirmText}>
                    Remove this offering? Existing bookings will not be affected.
                  </ThemedText>
                  <View style={styles.deleteConfirmActions}>
                    <Pressable
                      style={styles.keepButton}
                      onPress={() => setPendingDeleteId(null)}
                      accessibilityRole="button"
                      testID={`button-keep-${offering.id}`}
                    >
                      <ThemedText style={styles.keepButtonText}>Keep</ThemedText>
                    </Pressable>
                    <Pressable
                      style={styles.confirmDeleteButton}
                      onPress={() => confirmDelete(offering.id)}
                      disabled={deletingId === offering.id}
                      accessibilityRole="button"
                      testID={`button-confirm-delete-${offering.id}`}
                    >
                      {deletingId === offering.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText style={styles.confirmDeleteButtonText}>Delete</ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}

        {deleteError ? (
          <View style={styles.deleteErrorBanner}>
            <ThemedText style={styles.deleteErrorText}>{deleteError}</ThemedText>
          </View>
        ) : null}

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LayoutSpacing.md + 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
    minHeight: 52,
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textMuted,
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
  deleteConfirmRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(1, 50, 32, 0.16)",
    gap: Spacing.sm,
  },
  deleteConfirmText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
  },
  deleteConfirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.sm,
  },
  keepButton: {
    minWidth: 64,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.xs,
    backgroundColor: "rgba(1, 50, 32, 0.08)",
    paddingHorizontal: Spacing.md,
  },
  keepButtonText: {
    color: Colors.light.text,
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
  confirmDeleteButton: {
    minWidth: 76,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.xs,
    backgroundColor: "#8B3A3A",
    paddingHorizontal: Spacing.md,
  },
  confirmDeleteButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
  deleteErrorBanner: {
    backgroundColor: "rgba(139, 58, 58, 0.08)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  deleteErrorText: {
    color: "#8B3A3A",
    fontSize: 13,
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
