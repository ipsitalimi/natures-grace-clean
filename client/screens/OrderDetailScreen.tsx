import React, { useCallback, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import ProductImageView from "@/components/ProductImageView";
import { PageLayout } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useDataContext } from "@/context/DataContext";
import { getOrderStatusColor, getPaymentStatusColor } from "@/data/orders";
import { DELIVERY_LABELS } from "@/constants/deliveryOptions";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { fetchOrderForUser } from "@/services/content/ordersService";
import type { DbOrderItemRow, DbOrderRow } from "@/services/content/ordersService";

import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type ParamList = {
  OrderDetail: { orderId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

export default function OrderDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ParamList, "OrderDetail">>();
  const { orderId } = route.params;
  const { session } = useAuth();
  const { storeCategories } = useDataContext();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<DbOrderRow | null>(null);
  const [items, setItems] = useState<DbOrderItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const allProducts = storeCategories.flatMap((c) => c.products);

  const loadOrder = useCallback(async () => {
    if (!isSupabaseConfigured() || !session?.user?.id) {
      setLoading(false);
      setError("Sign in to view order details.");
      return;
    }
    setLoading(true);
    setError(null);
    const detail = await fetchOrderForUser(orderId, session.user.id);
    if (!detail) {
      setOrder(null);
      setItems([]);
      setError("Order not found.");
    } else {
      setOrder(detail.order);
      setItems(detail.items);
    }
    setLoading(false);
  }, [orderId, session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadOrder();
    }, [loadOrder])
  );

  const statusStyle = order ? getOrderStatusColor(order.status) : null;
  const paymentStyle = order ? getPaymentStatusColor(order.payment_status) : null;
  const deliveryLabel =
    order?.delivery_option && DELIVERY_LABELS[order.delivery_option]
      ? DELIVERY_LABELS[order.delivery_option]
      : order?.delivery_option ?? "—";

  return (
    <PageLayout
      title="Order Detail"
      titleInHeader
      header="back"
      scrollable={Boolean(order && !loading)}
      contentContainerStyle={styles.content}
    >
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.mutedText}>Loading order…</ThemedText>
        </View>
      ) : error || !order ? (
        <View style={styles.centered}>
          <ThemedText style={styles.mutedText}>{error ?? "Order not found."}</ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <ThemedText style={styles.orderNumber}>{order.order_number}</ThemedText>
            <View style={styles.badgeRow}>
              {statusStyle ? (
                <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                  <ThemedText style={[styles.badgeText, { color: statusStyle.text }]}>
                    {order.status}
                  </ThemedText>
                </View>
              ) : null}
              {paymentStyle ? (
                <View style={[styles.badge, { backgroundColor: paymentStyle.bg }]}>
                  <ThemedText style={[styles.badgeText, { color: paymentStyle.text }]}>
                    {order.payment_status}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <DetailRow
              label="Placed"
              value={new Date(order.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
            <DetailRow label="Delivery" value={deliveryLabel} />
            {order.notes?.trim() ? <DetailRow label="Notes" value={order.notes.trim()} /> : null}
          </View>

          <ThemedText style={styles.sectionTitle}>Shipping</ThemedText>
          <View style={styles.card}>
            {order.courier || order.tracking_number ? (
              <>
                {order.courier ? <DetailRow label="Courier" value={order.courier} /> : null}
                {order.tracking_number ? (
                  <DetailRow label="Tracking #" value={order.tracking_number} />
                ) : null}
                {order.tracking_status ? (
                  <DetailRow label="Status" value={order.tracking_status} />
                ) : null}
                {order.expected_delivery ? (
                  <DetailRow
                    label="Expected delivery"
                    value={new Date(order.expected_delivery).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                ) : null}
              </>
            ) : (
              <ThemedText style={styles.trackingPlaceholder}>
                Tracking information will appear once the seller dispatches your order.
              </ThemedText>
            )}
          </View>

          {order.payment_status === "Paid" && order.status !== "Cancelled" ? (
            <Pressable
              style={styles.refundBtn}
              onPress={() => navigation.navigate("RefundRequest", { orderId: order.id })}
            >
              <ThemedText style={styles.refundBtnText}>Request a refund</ThemedText>
            </Pressable>
          ) : null}

          <ThemedText style={styles.sectionTitle}>Items</ThemedText>
          {items.map((item) => {
            const product = allProducts.find((p) => p.id === item.product_id);
            return (
              <View key={item.id} style={styles.itemCard}>
                <ProductImageView
                  product={{
                    id: item.product_id ?? item.id,
                    imageKey: product?.imageKey,
                    imageUrl: product?.imageUrl,
                  }}
                  containerStyle={styles.itemImage}
                  imageStyle={styles.itemImage}
                  iconSize={22}
                />
                <View style={styles.itemInfo}>
                  <ThemedText style={styles.itemName}>{item.product_name}</ThemedText>
                  <ThemedText style={styles.itemMeta}>
                    {item.product_category} · Qty {item.quantity}
                  </ThemedText>
                  <ThemedText style={styles.itemPrice}>₹{item.line_total.toFixed(0)}</ThemedText>
                </View>
              </View>
            );
          })}

          <View style={styles.card}>
            <DetailRow label="Subtotal" value={`₹${Number(order.subtotal).toFixed(0)}`} />
            <DetailRow label="Delivery fee" value={`₹${Number(order.delivery_fee).toFixed(0)}`} />
            {order.promo_discount > 0 ? (
              <DetailRow label="Discount" value={`-₹${Number(order.promo_discount).toFixed(0)}`} />
            ) : null}
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>₹{Number(order.total).toFixed(0)}</ThemedText>
            </View>
          </View>
        </>
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: LayoutSpacing.xs,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: Spacing.xl,
  },
  mutedText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: 10,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  badgeRow: { flexDirection: "row", gap: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: { fontSize: 14, color: Colors.light.textMuted },
  detailValue: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: 12,
    alignItems: "center",
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
  },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 15, fontWeight: "600", color: Colors.light.text },
  itemMeta: { fontSize: 12, color: Colors.light.textMuted },
  itemPrice: { fontSize: 14, fontWeight: "700", color: Colors.light.accent, marginTop: 2 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: `${Colors.light.divider}60`,
  },
  totalLabel: { fontSize: 16, fontWeight: "700", color: Colors.light.text },
  totalValue: { fontSize: 16, fontWeight: "700", color: Colors.light.accent },
  trackingPlaceholder: {
    fontSize: 14,
    color: Colors.light.textMuted,
    lineHeight: 20,
  },
  refundBtn: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  refundBtnText: { color: Colors.light.accent, fontWeight: "600", fontSize: 14 },
});
