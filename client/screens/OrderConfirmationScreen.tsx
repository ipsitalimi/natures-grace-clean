import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Image, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { productImages } from "@/data/storeProducts";
import { useDataContext } from "@/context/DataContext";
import { useCart } from "@/context/CartContext";

type OrderConfirmationParamList = {
  OrderConfirmation: {
    deliveryOption: string;
    totalPrice: number;
  };
};

type OrderConfirmationRouteProp = RouteProp<OrderConfirmationParamList, "OrderConfirmation">;

const deliveryLabels: Record<string, string> = {
  standard: "Standard Delivery (5-7 business days)",
  express: "Express Delivery (2-3 business days)",
  overnight: "Overnight Delivery (Next business day)",
};

export default function OrderConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<OrderConfirmationRouteProp>();
  const { deliveryOption, totalPrice } = route.params;
  const { storeCategories } = useDataContext();
  const { items, clearCart } = useCart();

  const orderedItemsRef = useRef(items.map((item) => ({ ...item })));
  const orderedItems = orderedItemsRef.current;

  const allProducts = storeCategories.flatMap((c) => c.products);

  useEffect(() => {
    clearCart();
  }, []);

  const handleContinueShopping = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Main" }],
      })
    );
  };

  const orderNumber = useRef(Math.floor(100000 + Math.random() * 900000)).current;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successIconContainer}>
          <View style={styles.successCircle}>
            <Feather name="check" size={40} color="#FFFFFF" />
          </View>
        </View>

        <ThemedText style={styles.title}>Order Placed</ThemedText>
        <ThemedText style={styles.subtitle}>
          Thank you for your order! Your wellness journey continues.
        </ThemedText>

        <View style={styles.orderCard}>
          <ThemedText style={styles.orderCardTitle}>Order Items</ThemedText>
          {orderedItems.map((item) => {
            const product = allProducts.find((p) => p.id === item.productId);
            if (!product) return null;
            return (
              <View key={item.productId} style={styles.orderProductRow}>
                <View style={styles.orderImageContainer}>
                  {productImages[product.id] ? (
                    <Image source={productImages[product.id]} style={styles.orderImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.orderImagePlaceholder} />
                  )}
                </View>
                <View style={styles.orderProductInfo}>
                  <ThemedText style={styles.orderProductName} numberOfLines={2}>{product.name}</ThemedText>
                  <ThemedText style={styles.orderProductQty}>Qty: {item.quantity}</ThemedText>
                </View>
                <ThemedText style={styles.orderProductPrice}>
                  ${(product.price * item.quantity).toFixed(2)}
                </ThemedText>
              </View>
            );
          })}

          <View style={styles.orderDivider} />

          <View style={styles.orderDetailRow}>
            <Feather name="truck" size={14} color={Colors.light.textSecondary} />
            <ThemedText style={styles.orderDetailText}>
              {deliveryLabels[deliveryOption] || "Standard Delivery"}
            </ThemedText>
          </View>

          <View style={styles.orderDetailRow}>
            <Feather name="credit-card" size={14} color={Colors.light.textSecondary} />
            <ThemedText style={styles.orderDetailText}>
              Total: ${totalPrice.toFixed(2)}
            </ThemedText>
          </View>

          <View style={styles.orderDetailRow}>
            <Feather name="hash" size={14} color={Colors.light.textSecondary} />
            <ThemedText style={styles.orderDetailText}>
              Order #{orderNumber}
            </ThemedText>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Feather name="mail" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.infoText}>
            A confirmation email with your order details and tracking information will be sent to your registered email address.
          </ThemedText>
        </View>

        <View style={styles.buttonsContainer}>
          <Pressable
            style={styles.primaryButton}
            onPress={handleContinueShopping}
            testID="button-continue-shopping"
          >
            <ThemedText style={styles.primaryButtonText}>Continue Shopping</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: Spacing.xl,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.button,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.light.accent,
    fontFamily: "ui-serif",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing["2xl"],
  },
  orderCard: {
    width: "100%",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  orderCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  orderProductRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  orderImageContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    backgroundColor: Colors.light.backgroundSecondary,
  },
  orderImage: {
    width: "100%",
    height: "100%",
  },
  orderImagePlaceholder: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  orderProductInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  orderProductName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  orderProductQty: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  orderProductPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.accent,
    marginLeft: 8,
  },
  orderDivider: {
    height: 1,
    backgroundColor: Colors.light.divider,
    marginVertical: Spacing.md,
  },
  orderDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  orderDetailText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  infoCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${Colors.light.accent}10`,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
    marginBottom: Spacing["2xl"],
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 20,
  },
  buttonsContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
