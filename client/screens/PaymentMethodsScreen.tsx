import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout, Card } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { usePaymentMethods } from "@/context/PaymentMethodsContext";
import type { PaymentMethodCardView } from "@/data/paymentMethods";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

function PaymentCard({
  card,
  onDelete,
  onSetDefault,
}: {
  card: PaymentMethodCardView;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <Card
      onPress={card.isDefault ? undefined : onSetDefault}
      testID={`payment-card-${card.id}`}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardIcon}>
          <Feather name="credit-card" size={24} color={Colors.light.accent} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <ThemedText style={styles.cardType}>
              {card.type} ending in {card.lastFour}
            </ThemedText>
            {card.isDefault ? (
              <View style={styles.defaultBadge}>
                <ThemedText style={styles.defaultBadgeText}>Default</ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText style={styles.cardExpiry}>Expires {card.expires}</ThemedText>
        </View>
        <Pressable
          style={styles.deleteButton}
          onPress={onDelete}
          testID={`button-delete-card-${card.id}`}
        >
          <Feather name="trash-2" size={18} color="#D4534A" />
        </Pressable>
      </View>
    </Card>
  );
}

export default function PaymentMethodsScreen() {
  const { session } = useAuth();
  const {
    cardViews,
    methodsLoading,
    methodsError,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
  } = usePaymentMethods();

  const [showAddForm, setShowAddForm] = useState(false);
  const [brand, setBrand] = useState("Visa");
  const [last4, setLast4] = useState("");
  const [expires, setExpires] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAddPress = () => {
    if (!showAddForm) {
      setShowAddForm(true);
      setActionError(null);
      return;
    }
    handleSaveNew();
  };

  const handleSaveNew = async () => {
    if (!brand.trim() || last4.replace(/\D/g, "").length !== 4 || !expires.trim()) {
      setActionError("Enter card brand, last 4 digits, and expiry (MM/YY).");
      return;
    }

    if (!isSupabaseConfigured()) {
      setActionError("Sign in with Supabase configured to save payment methods.");
      return;
    }

    if (!session?.user) {
      setActionError("Sign in to save payment methods.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    const created = await addPaymentMethod({
      brand: brand.trim(),
      last4: last4.replace(/\D/g, "").slice(-4),
      expiryLabel: expires.trim(),
    });

    if (!created) {
      setActionError("Could not save payment method.");
      setSubmitting(false);
      return;
    }

    setBrand("Visa");
    setLast4("");
    setExpires("");
    setShowAddForm(false);
    setConfirmation(true);
    setTimeout(() => setConfirmation(false), 2500);
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    const ok = await removePaymentMethod(id);
    if (!ok) {
      setActionError("Could not remove payment method.");
    }
  };

  const handleSetDefault = async (id: string) => {
    setActionError(null);
    const ok = await setDefaultPaymentMethod(id);
    if (!ok) {
      setActionError("Could not update default payment method.");
    }
  };

  return (
    <PageLayout
      title="Payment References"
      titleInHeader
      header="back"
      contentContainerStyle={styles.content}
    >
      <View style={styles.infoBanner}>
        <Feather name="info" size={16} color={Colors.light.accent} />
        <ThemedText style={styles.infoBannerText}>
          Saved cards are stored for your reference only. Checkout still uses Razorpay and does not charge these cards automatically.
        </ThemedText>
      </View>

      {methodsLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.loadingText}>Loading payment methods…</ThemedText>
        </View>
      ) : null}

      {methodsError ? (
        <ThemedText style={styles.errorText}>{methodsError}</ThemedText>
      ) : null}

      {actionError ? <ThemedText style={styles.errorText}>{actionError}</ThemedText> : null}

      {!session?.user && isSupabaseConfigured() ? (
        <ThemedText style={styles.errorText}>Sign in to manage payment methods.</ThemedText>
      ) : null}

      {!methodsLoading && !methodsError && cardViews.length === 0 ? (
        <ThemedText style={styles.emptyText}>No saved payment references yet.</ThemedText>
      ) : null}

      {cardViews.map((card) => (
        <PaymentCard
          key={card.id}
          card={card}
          onDelete={() => handleDelete(card.id)}
          onSetDefault={() => handleSetDefault(card.id)}
        />
      ))}

      {showAddForm ? (
        <Card style={styles.addForm}>
          <ThemedText style={styles.formLabel}>Card brand</ThemedText>
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="Visa"
            placeholderTextColor={Colors.light.textSecondary}
            testID="input-card-brand"
          />
          <ThemedText style={styles.formLabel}>Last 4 digits</ThemedText>
          <TextInput
            style={styles.input}
            value={last4}
            onChangeText={setLast4}
            placeholder="4242"
            placeholderTextColor={Colors.light.textSecondary}
            keyboardType="number-pad"
            maxLength={4}
            testID="input-card-last4"
          />
          <ThemedText style={styles.formLabel}>Expiry (MM/YY)</ThemedText>
          <TextInput
            style={styles.input}
            value={expires}
            onChangeText={setExpires}
            placeholder="09/27"
            placeholderTextColor={Colors.light.textSecondary}
            testID="input-card-expiry"
          />
          <ThemedText style={styles.formHint}>
            Only masked details are stored — never your full card number or CVV.
          </ThemedText>
        </Card>
      ) : null}

      {confirmation ? (
        <ThemedText style={styles.confirmationText} testID="text-payment-added">
          Payment Method Added
        </ThemedText>
      ) : null}

      <Pressable
        style={[styles.addButton, submitting && styles.addButtonDisabled]}
        onPress={handleAddPress}
        disabled={submitting}
        testID="button-add-payment"
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Feather name="plus" size={18} color="#FFFFFF" />
            <ThemedText style={styles.addButtonText}>
              {showAddForm ? "Save Payment Method" : "Add Payment Method"}
            </ThemedText>
          </>
        )}
      </Pressable>

      {showAddForm ? (
        <Pressable
          style={styles.cancelLink}
          onPress={() => {
            setShowAddForm(false);
            setActionError(null);
          }}
          testID="button-cancel-add-payment"
        >
          <ThemedText style={styles.cancelLinkText}>Cancel</ThemedText>
        </Pressable>
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
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.text,
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
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginBottom: LayoutSpacing.sm,
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
  },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: LayoutSpacing.sm,
    marginBottom: 2,
  },
  cardType: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
  },
  defaultBadge: {
    backgroundColor: `${Colors.light.accent}15`,
    paddingHorizontal: LayoutSpacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  cardExpiry: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  deleteButton: {
    padding: LayoutSpacing.sm,
  },
  addForm: {
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginTop: LayoutSpacing.xs,
  },
  input: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: LayoutSpacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  formHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: LayoutSpacing.sm,
    lineHeight: 18,
  },
  confirmationText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
    textAlign: "center",
    marginTop: LayoutSpacing.sm,
  },
  addButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: LayoutSpacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: LayoutSpacing.sm,
    marginTop: LayoutSpacing.md,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cancelLink: {
    alignItems: "center",
    paddingVertical: LayoutSpacing.sm,
  },
  cancelLinkText: {
    fontSize: 14,
    color: Colors.light.accent,
    fontWeight: "500",
  },
});
