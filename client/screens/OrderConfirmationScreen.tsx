import React from "react";
import { View, StyleSheet, Pressable, Image, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProductImageView from "@/components/ProductImageView";
import { useDataContext } from "@/context/DataContext";
import { DELIVERY_LABELS } from "@/constants/deliveryOptions";
import { getScrollBottomPadding, getAuthScreenPaddingTop } from "@/lib/layoutInsets";

type ConfirmationItem = {
  productId: string;
  productName: string;
  productCategory: string;
  quantity: number;
  unitPrice: number;
};

type OrderConfirmationParamList = {
  OrderConfirmation: {
    orderNumber: string;
    deliveryOption: string;
    totalPrice: number;
    items: ConfirmationItem[];
  };
};

type OrderConfirmationRouteProp = RouteProp<OrderConfirmationParamList, "OrderConfirmation">;

export default function OrderConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<OrderConfirmationRouteProp>();
  const { orderNumber, deliveryOption, totalPrice, items } = route.params;
  const { storeCategories } = useDataContext();

  const allProducts = storeCategories.flatMap((c) => c.products);

  const handleContinueShopping = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Main" }],
      })
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: getAuthScreenPaddingTop(insets.top) + 28,
            paddingBottom: getScrollBottomPadding(insets.bottom, 20),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successIconContainer}>
          <View style={styles.successCircle}>
            <Feather name="check" size={40} color="#FFFFFF" />
          </View>
        </View>

        <ThemedText style={styles.title}>Order Placed</ThemedText>
        <ThemedText style={styles.subtitle}>
          Thank you for your order! Payment confirmed — your wellness journey continues.
        </ThemedText>

        <View style={styles.orderCard}>
          <ThemedText style={styles.orderCardTitle}>Order Items</ThemedText>
          {items.map((item) => {
            const product = allProducts.find((p) => p.id === item.productId);
            return (
              <View key={item.productId} style={styles.orderProductRow}>
                <View style={styles.orderImageContainer}>
                  {product ? (
                    <ProductImageView
                      product={product}
                      containerStyle={styles.orderImage}
                      imageStyle={styles.orderImage}
                    />
                  ) : (
                    <View style={styles.orderImagePlaceholder} />
                  )}
                </View>
                <View style={styles.orderProductInfo}>
                  <ThemedText style={styles.orderProductName} numberOfLines={2}>{item.productName}</ThemedText>
                  <ThemedText style={styles.orderProductQty}>Qty: {item.quantity}</ThemedText>
                </View>
                <ThemedText style={styles.orderProductPrice}>
                  ₹{(item.unitPrice * item.quantity).toFixed(0)}
                </ThemedText>
              </View>
            );
          })}

          <View style={styles.orderDivider} />

          <View style={styles.orderDetailRow}>
            <Feather name="truck" size={14} color={Colors.light.textSecondary} />
            <ThemedText style={styles.orderDetailText}>
              {DELIVERY_LABELS[deliveryOption] || deliveryOption || "Standard Delivery"}
            </ThemedText>
          </View>

          <View style={styles.orderDetailRow}>
            <Feather name="credit-card" size={14} color={Colors.light.textSecondary} />
            <ThemedText style={styles.orderDetailText}>
              Total: ₹{totalPrice.toFixed(0)}
            </ThemedText>
          </View>

          <View style={styles.orderDetailRow}>
            <Feather name="hash" size={14} color={Colors.light.textSecondary} />
            <ThemedText style={styles.orderDetailText}>
              Order {orderNumber}
            </ThemedText>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Feather name="bell" size={16} color={Colors.light.accent} />
          <ThemedText style={styles.infoText}>
            Track your order in Order History and Notifications. Shipping and delivery updates appear there as your seller fulfills the order.
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
