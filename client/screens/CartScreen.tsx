import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable, Image, TextInput, ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ScreenHeader } from "@/components/layout";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProductImageView from "@/components/ProductImageView";
import { useDataContext } from "@/context/DataContext";
import { useCart } from "@/context/CartContext";
import { useOrdersContext } from "@/context/OrdersContext";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { runStoreCheckoutPayment } from "@/services/storeCheckoutService";
import * as ordersService from "@/services/content/ordersService";
import {
  deliveryFeeForSellerOption,
  getEnabledSellerDeliveryOptions,
  parseSellerDeliverySettings,
  sellerDeliveryLabel,
} from "@/constants/sellerDelivery";
import {
  fetchSellerDeliveryBySellerIds,
  type SellerDeliveryProfile,
} from "@/services/commerce/sellerDeliveryService";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { formatInr } from "@/lib/formatCurrency";

type ConfirmationItem = {
  productId: string;
  productName: string;
  productCategory: string;
  quantity: number;
  unitPrice: number;
};

type CartNavParamList = {
  Cart: undefined;
  OrderConfirmation: {
    orderNumber: string;
    deliveryOption: string;
    totalPrice: number;
    items: ConfirmationItem[];
  };
};

type NavigationProp = NativeStackNavigationProp<CartNavParamList>;

export default function CartScreen() {
  const { scrollPaddingBottom } = useLayoutInsets(Spacing.xl);
  const navigation = useNavigation<NavigationProp>();
  const { storeCategories } = useDataContext();
  const { profile, session } = useAuth();
  const { createOrderFromCheckout, refreshOrders } = useOrdersContext();
  const {
    items,
    checkout,
    updateQuantity,
    removeItem,
    setDeliveryOption,
    setSellerDeliveryOption,
    removeOrderedItems,
    setOrderNote,
    prepareCheckout,
    clearCart,
    cartLoading,
    cartError,
    applyPromoCode,
    clearAppliedPromo,
    cartMutating,
  } = useCart();

  const [note, setNote] = useState(checkout.orderNote);
  const [placingSellerId, setPlacingSellerId] = useState<string | null>(null);
  const [sellerProfiles, setSellerProfiles] = useState<Record<string, SellerDeliveryProfile>>({});
  const [deliveryLoadError, setDeliveryLoadError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoBanner, setPromoBanner] = useState<string | null>(null);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoBanner(null);
    const res = await applyPromoCode(promoInput);
    if (!res.ok) {
      setPromoBanner(res.error);
      return;
    }
    setPromoInput("");
  };

  const handleRemovePromo = async () => {
    setPromoBanner(null);
    await clearAppliedPromo();
    setPromoInput("");
  };

  useEffect(() => {
    setNote(checkout.orderNote);
  }, [checkout.orderNote]);

  const allProducts = storeCategories.flatMap((c) => c.products);

  const cartProducts = items.map((item) => {
    const product = allProducts.find((p) => p.id === item.productId);
    return { ...item, product };
  });

  useEffect(() => {
    const sellerIds = [
      ...new Set(
        cartProducts
          .map((item) => item.product?.sellerId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    if (sellerIds.length === 0) {
      setSellerProfiles({});
      setDeliveryLoadError(null);
      return;
    }
    setDeliveryLoadError(null);
    void fetchSellerDeliveryBySellerIds(sellerIds)
      .then((profiles) => {
        setSellerProfiles(profiles);
      })
      .catch(() => {
        setDeliveryLoadError("Could not load delivery options. Using defaults — try again before checkout.");
        setSellerProfiles({});
      });
  }, [items]);

  const sellerGroups = useMemo(() => {
    const bySeller = new Map<string, typeof cartProducts>();
    for (const item of cartProducts) {
      const sellerId = item.product?.sellerId ?? "unknown";
      const list = bySeller.get(sellerId) ?? [];
      list.push(item);
      bySeller.set(sellerId, list);
    }

    return [...bySeller.entries()].map(([sellerId, groupItems]) => {
      const profile = sellerProfiles[sellerId];
      const settings = profile?.settings ?? parseSellerDeliverySettings(null);
      const deliveryOptions = getEnabledSellerDeliveryOptions(settings);
      const selected =
        checkout.sellerDeliveryOptions[sellerId] ?? deliveryOptions[0]?.id ?? "standard";
      const valid = deliveryOptions.some((o) => o.id === selected)
        ? selected
        : deliveryOptions[0]?.id ?? "standard";
      const subtotal = groupItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const deliveryFee = deliveryFeeForSellerOption(settings, valid);
      return {
        sellerId,
        storeName: profile?.storeName ?? "Seller",
        settings,
        items: groupItems,
        deliveryOptions,
        selectedOptionId: valid,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
      };
    });
  }, [cartProducts, sellerProfiles, checkout.sellerDeliveryOptions]);

  const singleSellerGroup = sellerGroups.length === 1 ? sellerGroups[0] : null;
  const computedSubtotal = sellerGroups.reduce((sum, group) => sum + group.subtotal, 0);
  const computedDeliveryFee = sellerGroups.reduce((sum, group) => sum + group.deliveryFee, 0);
  const promoDiscount = checkout.promoDiscount ?? 0;
  const subtotal = computedSubtotal;
  const deliveryFee = computedDeliveryFee;
  const total = Math.max(0, subtotal - promoDiscount + deliveryFee);

  const handlePlaceOrderForSeller = async (sellerId: string) => {
    const group = sellerGroups.find((g) => g.sellerId === sellerId);
    if (!group || group.items.length === 0 || placingSellerId) return;

    if (!isSupabaseConfigured() || !session?.user) {
      Alert.alert("Sign in required", "Please sign in to complete checkout.");
      return;
    }

    setPlacingSellerId(sellerId);
    await setOrderNote(note);
    const checkoutForOrder = await prepareCheckout();
    if (!checkoutForOrder) {
      setPlacingSellerId(null);
      Alert.alert("Checkout", "Could not prepare your cart. Please try again.");
      return;
    }

    const lineItems = group.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productCategory: item.productCategory,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    const orderTotal = Math.max(
      0,
      group.subtotal - (sellerGroups.length === 1 ? promoDiscount : 0) + group.deliveryFee
    );
    const deliveryFeeForOrder = group.deliveryFee;

    const pendingOrder = await createOrderFromCheckout({
      customerName: profile?.full_name || "Guest",
      customerEmail: profile?.email,
      items: lineItems,
      paymentStatus: "Pending",
      deliveryOption: group.selectedOptionId,
      deliveryFee: deliveryFeeForOrder,
      notes: note.trim() || undefined,
      promoDiscount:
        sellerGroups.length === 1 && checkoutForOrder.promoDiscount > 0
          ? checkoutForOrder.promoDiscount
          : undefined,
      sellerPromoId:
        sellerGroups.length === 1 ? checkoutForOrder.sellerPromoId ?? undefined : undefined,
      platformPromoId:
        sellerGroups.length === 1 ? checkoutForOrder.platformPromoId ?? undefined : undefined,
    });

    if (!pendingOrder) {
      setPlacingSellerId(null);
      Alert.alert("Checkout", "Could not create your order. Please try again.");
      return;
    }

    if (!session?.access_token) {
      setPlacingSellerId(null);
      Alert.alert("Checkout", "Please sign in to complete your purchase.");
      return;
    }

    const payment = await runStoreCheckoutPayment({
      storeOrderId: pendingOrder.id,
      amountInr: orderTotal,
      accessToken: session.access_token,
      customerName: profile?.full_name || undefined,
      customerEmail: profile?.email,
    });

    setPlacingSellerId(null);

    if (payment.error) {
      // Always cancel unpaid Pending orders so retries don't leave orphans / duplicates.
      await ordersService.cancelPendingOrder(pendingOrder.id);
      await refreshOrders();
      Alert.alert(
        "Payment",
        payment.error === "Payment cancelled"
          ? "Payment was cancelled. Your pending order has been cancelled."
          : `${payment.error}\n\nNo charge was completed. You can try again.`
      );
      return;
    }

    await refreshOrders();
    const confirmationItems: ConfirmationItem[] = lineItems;
    await removeOrderedItems(group.items.map((i) => i.productId));

    if (items.length === group.items.length) {
      await clearCart();
    }

    navigation.navigate("OrderConfirmation", {
      orderNumber: payment.orderNumber ?? pendingOrder.orderId,
      deliveryOption: sellerDeliveryLabel(group.settings, group.selectedOptionId),
      totalPrice: orderTotal,
      items: confirmationItems,
    });
  };

  const handlePlaceOrder = async () => {
    if (!singleSellerGroup) return;
    await handlePlaceOrderForSeller(singleSellerGroup.sellerId);
  };

  if (cartLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          variant="back"
          showNotifications={false}
          center={
            <ThemedText style={styles.headerTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
              Cart
            </ThemedText>
          }
        />
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
          <ThemedText style={styles.emptySubtitle}>Loading cart…</ThemedText>
        </View>
      </View>
    );
  }

  if (cartError) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          variant="back"
          showNotifications={false}
          center={
            <ThemedText style={styles.headerTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
              Cart
            </ThemedText>
          }
        />
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptySubtitle}>{cartError}</ThemedText>
        </View>
      </View>
    );
  }

  if (cartProducts.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          variant="back"
          showNotifications={false}
          center={
            <ThemedText style={styles.headerTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
              Cart
            </ThemedText>
          }
        />
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
      <ScreenHeader
        variant="back"
        showNotifications={false}
        center={
          <ThemedText style={styles.headerTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
            Cart ({cartProducts.length})
          </ThemedText>
        }
      />

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {sellerGroups.map((group) => (
          <View key={group.sellerId} style={styles.sellerGroup}>
            <View style={styles.sellerGroupHeader}>
              <Feather name="shopping-bag" size={18} color={Colors.light.accent} />
              <ThemedText style={styles.sellerGroupTitle}>{group.storeName}</ThemedText>
            </View>

            {group.items.map((item) => {
              const product = item.product;
              return (
                <View key={item.productId} style={styles.cartItemCard} testID={`cart-item-${item.productId}`}>
                  <View style={styles.cartItemTop}>
                    <View style={styles.productImageContainer}>
                      {product ? (
                        <ProductImageView
                          product={product}
                          containerStyle={styles.productImage}
                          imageStyle={styles.productImage}
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <View style={styles.placeholderCircle} />
                        </View>
                      )}
                    </View>
                    <View style={styles.productInfo}>
                      <ThemedText style={styles.productCategory}>{item.productCategory}</ThemedText>
                      <ThemedText style={styles.productName} numberOfLines={2}>{item.productName}</ThemedText>
                      <ThemedText style={styles.productPrice}>{formatInr(item.unitPrice)}</ThemedText>
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
                      {formatInr(item.unitPrice * item.quantity)}
                    </ThemedText>
                  </View>
                </View>
              );
            })}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="truck" size={18} color={Colors.light.accent} />
                <ThemedText style={styles.sectionTitle}>Delivery from {group.storeName}</ThemedText>
              </View>
              <ThemedText style={styles.sectionSubtitle}>
                Options set by this seller — only their enabled speeds are shown.
              </ThemedText>
              <View style={styles.deliveryOptions}>
                {group.deliveryOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.deliveryCard,
                      group.selectedOptionId === option.id && styles.deliveryCardSelected,
                    ]}
                    onPress={() => void setSellerDeliveryOption(group.sellerId, option.id)}
                    testID={`delivery-option-${group.sellerId}-${option.id}`}
                  >
                    <View style={styles.deliveryCardLeft}>
                      <View
                        style={[
                          styles.radioOuter,
                          group.selectedOptionId === option.id && styles.radioOuterSelected,
                        ]}
                      >
                        {group.selectedOptionId === option.id ? <View style={styles.radioInner} /> : null}
                      </View>
                      <View style={styles.deliveryTextContainer}>
                        <ThemedText
                          style={[
                            styles.deliveryLabel,
                            group.selectedOptionId === option.id && styles.deliveryLabelSelected,
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
                        group.selectedOptionId === option.id && styles.deliveryPriceSelected,
                      ]}
                    >
                      {option.price === 0 ? "Free" : formatInr(option.price)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.sellerSubtotalCard}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatInr(group.subtotal)}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Delivery</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {group.deliveryFee === 0 ? "Free" : formatInr(group.deliveryFee)}
                </ThemedText>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <ThemedText style={styles.totalLabel}>Seller total</ThemedText>
                <ThemedText style={styles.totalValue}>{formatInr(group.total)}</ThemedText>
              </View>
            </View>

            {sellerGroups.length > 1 ? (
              <Pressable
                style={[
                  styles.placeOrderButton,
                  styles.placeOrderButtonInline,
                  (placingSellerId === group.sellerId || cartMutating) && styles.placeOrderButtonDisabled,
                ]}
                onPress={() => void handlePlaceOrderForSeller(group.sellerId)}
                disabled={placingSellerId === group.sellerId || cartMutating}
                testID={`button-place-order-${group.sellerId}`}
              >
                {placingSellerId === group.sellerId ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.placeOrderText}>
                    Place Order from {group.storeName} — {formatInr(group.total)}
                  </ThemedText>
                )}
              </Pressable>
            ) : null}
          </View>
        ))}

        {deliveryLoadError ? (
          <ThemedText style={styles.deliveryErrorText}>{deliveryLoadError}</ThemedText>
        ) : null}

        {sellerGroups.length > 1 ? (
          <ThemedText style={styles.multiSellerNote}>
            Promo codes apply when all items are from one seller. Place separate orders per store to use seller promos.
          </ThemedText>
        ) : null}

        {isSupabaseConfigured() && singleSellerGroup ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="tag" size={18} color={Colors.light.accent} />
              <ThemedText style={styles.sectionTitle}>Promo code</ThemedText>
            </View>
            <ThemedText style={styles.sectionSubtitle}>
              Seller codes when one store; global (admin) codes work for any cart. Supabase-backed.
            </ThemedText>
            <View style={styles.promoRow}>
              <TextInput
                style={styles.promoInput}
                value={promoInput}
                onChangeText={(t) => {
                  setPromoInput(t.toUpperCase());
                  setPromoBanner(null);
                }}
                placeholder="CODE"
                placeholderTextColor={Colors.light.textMuted}
                autoCapitalize="characters"
                testID="input-cart-promo"
              />
              <Pressable
                style={[styles.promoApplyBtn, cartMutating && styles.promoApplyBtnDisabled]}
                onPress={() => void handleApplyPromo()}
                disabled={cartMutating}
                testID="button-apply-promo"
              >
                <ThemedText style={styles.promoApplyBtnText}>Apply</ThemedText>
              </Pressable>
            </View>
            {checkout.promoCode ? (
              <View style={styles.appliedPromoRow}>
                <ThemedText style={styles.appliedPromoText}>Applied: {checkout.promoCode}</ThemedText>
                <Pressable onPress={() => void handleRemovePromo()} testID="button-remove-promo">
                  <ThemedText style={styles.removePromoText}>Remove</ThemedText>
                </Pressable>
              </View>
            ) : null}
            {promoBanner ? <ThemedText style={styles.promoBannerText}>{promoBanner}</ThemedText> : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="edit-3" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.sectionTitle}>Order Note</ThemedText>
          </View>
          <ThemedText style={styles.sectionSubtitle}>Any special instructions? (optional)</ThemedText>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={(text) => {
              setNote(text);
              setOrderNote(text);
            }}
            placeholder="e.g., Gift wrap please, include a note..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            testID="input-order-note"
          />
        </View>

        <View style={styles.summaryCard}>
          <ThemedText style={styles.summaryTitle}>
            {sellerGroups.length > 1 ? "Cart Overview" : "Order Summary"}
          </ThemedText>
          {sellerGroups.length > 1 ? (
            sellerGroups.map((group) => (
              <View key={group.sellerId} style={styles.summarySellerBlock}>
                <ThemedText style={styles.summarySellerName}>{group.storeName}</ThemedText>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Items + delivery</ThemedText>
                  <ThemedText style={styles.summaryValue}>{formatInr(group.total)}</ThemedText>
                </View>
              </View>
            ))
          ) : (
            cartProducts.map((item) => (
              <View key={item.productId} style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel} numberOfLines={1}>
                  {item.productName} x {item.quantity}
                </ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {formatInr(item.unitPrice * item.quantity)}
                </ThemedText>
              </View>
            ))
          )}
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>
              {sellerGroups.length > 1 ? "Combined delivery" : "Delivery"}
            </ThemedText>
            <ThemedText style={styles.summaryValue}>
              {deliveryFee === 0 ? "Free" : formatInr(deliveryFee)}
            </ThemedText>
          </View>
          {promoDiscount > 0 ? (
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel} numberOfLines={1}>
                Discount{checkout.promoCode ? ` (${checkout.promoCode})` : ""}
              </ThemedText>
              <ThemedText style={styles.summaryDiscount}>- {formatInr(promoDiscount)}</ThemedText>
            </View>
          ) : null}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={styles.totalValue}>{formatInr(total)}</ThemedText>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Feather name="info" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.noteCardText}>
            All products are community-vetted and aligned with our wellness philosophy. Returns accepted within 14 days.
          </ThemedText>
        </View>

        {isSupabaseConfigured() && session?.user ? (
          <View style={styles.paymentMethodCard} testID="cart-payment-method">
            <View style={styles.paymentMethodHeader}>
              <Feather name="shield" size={18} color={Colors.light.accent} />
              <ThemedText style={styles.paymentMethodTitle}>Secure payment</ThemedText>
            </View>
            <ThemedText style={styles.paymentMethodMuted}>
              You&apos;ll complete payment securely with Razorpay when you place the order. We never
              store full card details in the app.
            </ThemedText>
          </View>
        ) : null}

        {singleSellerGroup ? (
          <Pressable
            style={[
              styles.placeOrderButton,
              styles.placeOrderButtonScrollEnd,
              (placingSellerId || cartMutating) && styles.placeOrderButtonDisabled,
            ]}
            onPress={() => void handlePlaceOrder()}
            disabled={Boolean(placingSellerId) || cartMutating}
            testID="button-place-order"
          >
            {placingSellerId ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.placeOrderText}>Place Order — {formatInr(total)}</ThemedText>
            )}
          </Pressable>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: Colors.light.accent,
    flexShrink: 1,
    textAlign: "center",
    includeFontPadding: false,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
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
  sellerGroup: {
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  sellerGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.md,
  },
  sellerGroupTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  sellerSubtotalCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  placeOrderButtonInline: {
    marginBottom: Spacing.lg,
  },
  summarySellerBlock: {
    marginBottom: Spacing.sm,
  },
  summarySellerName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
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
  promoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  promoInput: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  promoApplyBtn: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  promoApplyBtnDisabled: {
    opacity: 0.55,
  },
  promoApplyBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  appliedPromoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  appliedPromoText: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: "600",
  },
  removePromoText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  promoBannerText: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: "#8B3A3A",
  },
  deliveryErrorText: {
    fontSize: 13,
    color: "#8B3A3A",
    textAlign: "center",
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  multiSellerNote: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    lineHeight: 18,
  },
  summaryDiscount: {
    fontSize: 14,
    color: "#013220",
    fontWeight: "600",
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
  paymentMethodCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  paymentMethodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  paymentMethodTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  paymentMethodText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  paymentMethodMuted: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  paymentMethodLink: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: Spacing.xs,
  },
  placeOrderButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  placeOrderButtonScrollEnd: {
    marginTop: Spacing.xl,
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  placeOrderButtonDisabled: {
    opacity: 0.7,
  },
});
