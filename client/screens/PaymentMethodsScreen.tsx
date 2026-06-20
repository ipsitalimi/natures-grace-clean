import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { usePaymentMethods } from "@/context/PaymentMethodsContext";
import type { PaymentMethodCardView } from "@/data/paymentMethods";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";

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
    <Pressable
      style={styles.card}
      onPress={onSetDefault}
      disabled={card.isDefault}
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
    </Pressable>
  );
}

export default function PaymentMethodsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
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
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable
          style={styles.headerIconButton}
          onPress={() => navigation.navigate("Notifications" as never)}
          testID="button-notifications"
        >
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Payment References</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getScrollBottomPadding(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <View style={styles.addForm}>
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
          </View>
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
    paddingTop: Spacing.sm,
    gap: 10,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: `${Colors.light.accent}12`,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
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
    gap: 10,
    marginBottom: Spacing.sm,
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
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
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
    marginRight: Spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  cardType: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
  },
  defaultBadge: {
    backgroundColor: `${Colors.light.accent}15`,
    paddingHorizontal: 8,
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
    padding: 8,
  },
  addForm: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  formHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  confirmationText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  addButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Spacing.md,
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
    paddingVertical: Spacing.sm,
  },
  cancelLinkText: {
    fontSize: 14,
    color: Colors.light.accent,
    fontWeight: "500",
  },
});
