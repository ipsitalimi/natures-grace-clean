import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout, Card } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { usePaymentMethods } from "@/context/PaymentMethodsContext";
import type { PaymentMethodCardView } from "@/data/paymentMethods";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

function LegacyReferenceCard({
  card,
  onDelete,
}: {
  card: PaymentMethodCardView;
  onDelete: () => void;
}) {
  return (
    <Card testID={`payment-card-${card.id}`}>
      <View style={styles.cardContent}>
        <View style={styles.cardIcon}>
          <Feather name="credit-card" size={24} color={Colors.light.accent} />
        </View>
        <View style={styles.cardInfo}>
          <ThemedText style={styles.cardType}>
            {card.type} ending in {card.lastFour}
          </ThemedText>
          <ThemedText style={styles.cardExpiry}>Expires {card.expires}</ThemedText>
          <ThemedText style={styles.legacyHint}>Legacy reference — not charged</ThemedText>
        </View>
        <Pressable
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Remove payment reference ending in ${card.lastFour}`}
          testID={`button-delete-card-${card.id}`}
        >
          <Feather name="trash-2" size={18} color="#D4534A" />
        </Pressable>
      </View>
    </Card>
  );
}

/**
 * Payments are processed by Razorpay at checkout.
 * This screen no longer accepts manual card entry (Play Store / PCI safety).
 */
export default function PaymentMethodsScreen() {
  const { session } = useAuth();
  const { cardViews, methodsLoading, methodsError, removePaymentMethod } = usePaymentMethods();
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (removingId) return;
    setActionError(null);
    setRemovingId(id);
    const ok = await removePaymentMethod(id);
    setRemovingId(null);
    if (!ok) {
      setActionError("Could not remove payment reference.");
    }
  };

  return (
    <PageLayout title="Payments" titleInHeader header="back" contentContainerStyle={styles.content}>
      <View style={styles.infoBanner}>
        <Feather name="shield" size={18} color={Colors.light.accent} />
        <View style={styles.infoBannerCopy}>
          <ThemedText style={styles.infoTitle}>Secure checkout with Razorpay</ThemedText>
          <ThemedText style={styles.infoBannerText}>
            Store and session payments open Razorpay when you confirm. Nature&apos;s Grace does not
            store full card numbers, CVV, or charge cards from this screen.
          </ThemedText>
        </View>
      </View>

      <Card style={styles.howItWorks}>
        <ThemedText style={styles.howTitle}>How payment works</ThemedText>
        <ThemedText style={styles.howText}>1. Add items to cart or book a session</ThemedText>
        <ThemedText style={styles.howText}>2. Tap Place Order / Confirm Booking</ThemedText>
        <ThemedText style={styles.howText}>3. Complete payment in the Razorpay checkout</ThemedText>
      </Card>

      {methodsLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.loadingText}>Loading…</ThemedText>
        </View>
      ) : null}

      {methodsError ? <ThemedText style={styles.errorText}>{methodsError}</ThemedText> : null}
      {actionError ? <ThemedText style={styles.errorText}>{actionError}</ThemedText> : null}

      {!session?.user && isSupabaseConfigured() ? (
        <ThemedText style={styles.errorText}>Sign in to view payment details.</ThemedText>
      ) : null}

      {!methodsLoading && cardViews.length > 0 ? (
        <>
          <ThemedText style={styles.sectionLabel}>Older saved references</ThemedText>
          <ThemedText style={styles.sectionHint}>
            These were stored as labels only and are never charged. You can remove them.
          </ThemedText>
          {cardViews.map((card) => (
            <LegacyReferenceCard
              key={card.id}
              card={card}
              onDelete={() => void handleDelete(card.id)}
            />
          ))}
        </>
      ) : null}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: LayoutSpacing.sm,
    paddingTop: LayoutSpacing.sm,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: LayoutSpacing.sm,
    backgroundColor: `${Colors.light.accent}12`,
    borderRadius: BorderRadius.sm,
    padding: LayoutSpacing.md,
    marginBottom: LayoutSpacing.sm,
  },
  infoBannerCopy: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  infoBannerText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.text,
  },
  howItWorks: {
    gap: 6,
    marginBottom: LayoutSpacing.sm,
  },
  howTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  howText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textSecondary,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: LayoutSpacing.sm,
    marginBottom: LayoutSpacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: "#8B3A3A",
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: LayoutSpacing.sm,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textSecondary,
    marginBottom: LayoutSpacing.xs,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.light.accent}10`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: LayoutSpacing.md,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardType: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
  },
  cardExpiry: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  legacyHint: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 4,
  },
  deleteButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
