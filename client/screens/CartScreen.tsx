import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { productImages } from "@/data/storeProducts";
import { useDataContext } from "@/context/DataContext";
import { useCart } from "@/context/CartContext";

type CartNavParamList = {
  Cart: undefined;
  OrderConfirmation: {
    deliveryOption: string;
    totalPrice: number;
  };
};

type NavigationProp = NativeStackNavigationProp<CartNavParamList>;

const deliveryOptions = [
  { id: "standard", label: "Standard Delivery", duration: "5-7 business days", price: 0 },
  { id: "express", label: "Express Delivery", duration: "2-3 business days", price: 4.99 },
  { id: "overnight", label: "Overnight Delivery", duration: "Next business day", price: 9.99 },
];

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { storeCategories } = useDataContext();
  const { items, updateQuantity, removeItem } = useCart();

  const [selectedDelivery, setSelectedDelivery] = useState("standard");
  const [note, setNote] = useState("");

  const allProducts = storeCategories.flatMap((c) => c.products);

  const cartProducts = items.map((item) => {
    const product = allProducts.find((p) => p.id === item.productId);
    return { ...item, product };
  }).filter((item) => item.product != null);

  const deliveryOption = deliveryOptions.find((d) => d.id === selectedDelivery)!;
  const subtotal = cartProducts.reduce(
    (sum, item) => sum + (item.product!.price * item.quantity),
    0
  );
  const deliveryFee = deliveryOption.price;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = () => {
    navigation.navigate("OrderConfirmation", {
      deliveryOption: selectedDelivery,
      totalPrice: total,
    });
  };

  if (cartProducts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} testID="button-back">
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.headerTitle}>Cart</ThemedText>
          </View>
          <View style={styles.headerIconButton} />
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Feather name="shopping-cart" size={36} color={Colors.light.textMuted} />
          </View>
          <ThemedText style={styles.emptyTitle}>Your cart is empty</ThemedText>
          <ThemedText style={styles.emptySubtitle}>Browse the store and add some wellness products</ThemedText>
          <Pressable
            style={styles.emptyButton}
            onPress={() => navigation.goBack()}
            testID="button-browse-store"
          >
            <ThemedText style={styles.emptyButtonText}>Browse Store</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>Cart ({cartProducts.length})</ThemedText>
        </View>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="shopping-bag" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.sectionTitle}>Items</ThemedText>
          </View>
          {cartProducts.map((item) => {
            const product = item.product!;
            return (
              <View key={item.productId} style={styles.cartItemCard} testID={`cart-item-${item.productId}`}>
                <View style={styles.cartItemTop}>
                  <View style={styles.productImageContainer}>
                    {productImages[product.id] ? (
                      <Image source={productImages[product.id]} style={styles.productImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <View style={styles.placeholderCircle} />
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <ThemedText style={styles.productCategory}>{product.category}</ThemedText>
                    <ThemedText style={styles.productName} numberOfLines={2}>{product.name}</ThemedText>
                    <ThemedText style={styles.productPrice}>${product.price.toFixed(2)}</ThemedText>
                  </View>
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => removeItem(item.productId)}
                    testID={`button-remove-${item.productId}`}
                  >
                    <Feather name="trash-2" size={16} color="#D94F4F" />
                  </Pressable>
                </View>
                <View style={styles.cartItemBottom}>
                  <View style={styles.quantityRow}>
                    <Pressable
                      style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
                      onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      testID={`button-decrease-${item.productId}`}
                    >
                      <Feather name="minus" size={16} color={item.quantity <= 1 ? Colors.light.textMuted : Colors.light.accent} />
                    </Pressable>
                    <View style={styles.quantityDisplay}>
                      <ThemedText style={styles.quantityText}>{item.quantity}</ThemedText>
                    </View>
                    <Pressable
                      style={[styles.quantityButton, item.quantity >= 10 && styles.quantityButtonDisabled]}
                      onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= 10}
                      testID={`button-increase-${item.productId}`}
                    >
                      <Feather name="plus" size={16} color={item.quantity >= 10 ? Colors.light.textMuted : Colors.light.accent} />
                    </Pressable>
                  </View>
                  <ThemedText style={styles.itemSubtotal}>
                    ${(product.price * item.quantity).toFixed(2)}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="truck" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.sectionTitle}>Delivery Option</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>Choose your preferred delivery speed</ThemedText>
          <View style={styles.deliveryOptions}>
            {deliveryOptions.map((option) => (
              <Pressable
                key={option.id}
                style={[
                  styles.deliveryCard,
                  selectedDelivery === option.id && styles.deliveryCardSelected,
                ]}
                onPress={() => setSelectedDelivery(option.id)}
                testID={`delivery-option-${option.id}`}
              >
                <View style={styles.deliveryCardLeft}>
                  <View style={[styles.radioOuter, selectedDelivery === option.id && styles.radioOuterSelected]}>
                    {selectedDelivery === option.id ? <View style={styles.radioInner} /> : null}
                  </View>
                  <View style={styles.deliveryTextContainer}>
                    <ThemedText
                      style={[
                        styles.deliveryLabel,
                        selectedDelivery === option.id && styles.deliveryLabelSelected,
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                    <ThemedText style={styles.deliveryDuration}>{option.duration}</ThemedText>
                  </View>
                </View>
                <ThemedText
                  style={[
                    styles.deliveryPrice,
                    selectedDelivery === option.id && styles.deliveryPriceSelected,
                  ]}
                >
                  {option.price === 0 ? "Free" : `$${option.price.toFixed(2)}`}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="edit-3" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.sectionTitle}>Order Note</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>Any special instructions? (optional)</ThemedText>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="e.g., Gift wrap please, include a note..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            testID="input-order-note"
          />
        </View>

        <View style={styles.summaryCard}>
          <ThemedText style={styles.summaryTitle}>Order Summary</ThemedText>
          {cartProducts.map((item) => (
            <View key={item.productId} style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel} numberOfLines={1}>
                {item.product!.name} x {item.quantity}
              </ThemedText>
              <ThemedText style={styles.summaryValue}>
                ${(item.product!.price * item.quantity).toFixed(2)}
              </ThemedText>
            </View>
          ))}
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Delivery</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {deliveryFee === 0 ? "Free" : `$${deliveryFee.toFixed(2)}`}
            </ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={styles.totalValue}>${total.toFixed(2)}</ThemedText>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Feather name="info" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.noteCardText}>
            All products are community-vetted and aligned with our wellness philosophy. Returns accepted within 14 days.
          </ThemedText>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
          testID="button-place-order"
        >
          <ThemedText style={styles.placeOrderText}>Place Order - ${total.toFixed(2)}</ThemedText>
        </Pressable>
      </View>
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
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  cartItemCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  cartItemTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  productImageContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    backgroundColor: Colors.light.backgroundSecondary,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.accent,
    opacity: 0.08,
  },
  productInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  productCategory: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  removeButton: {
    padding: 8,
    marginLeft: 4,
  },
  cartItemBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.backgroundRoot,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
  },
  quantityButtonDisabled: {
    borderColor: Colors.light.divider,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  quantityDisplay: {
    minWidth: 28,
    alignItems: "center",
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  itemSubtotal: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  deliveryOptions: {
    gap: 10,
  },
  deliveryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  deliveryCardSelected: {
    borderColor: Colors.light.button,
    backgroundColor: `${Colors.light.button}08`,
  },
  deliveryCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.light.textMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: Colors.light.button,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.button,
  },
  deliveryTextContainer: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  deliveryLabelSelected: {
    color: Colors.light.accent,
  },
  deliveryDuration: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  deliveryPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  deliveryPriceSelected: {
    color: Colors.light.accent,
  },
  noteInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.light.text,
    minHeight: 80,
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    flex: 1,
    marginRight: Spacing.md,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.divider,
    marginVertical: Spacing.md,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
  },
  noteCardText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  placeOrderButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
