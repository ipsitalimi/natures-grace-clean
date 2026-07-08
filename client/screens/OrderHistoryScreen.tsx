import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout, Card } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import { useOrdersContext } from "@/context/OrdersContext";
import type { SellerOrder } from "@/data/orders";
import { getOrderStatusColor, getPaymentStatusColor } from "@/data/orders";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { formatInr } from "@/lib/formatCurrency";

type NavigationProp = NativeStackNavigationProp<{
  OrderHistory: undefined;
  OrderDetail: { orderId: string };
}>;

function OrderCard({
  order,
  onPress,
}: {
  order: SellerOrder;
  onPress: () => void;
}) {
  const statusStyle = getOrderStatusColor(order.status);
  const paymentStyle = getPaymentStatusColor(order.paymentStatus);

  return (
    <Card onPress={onPress} testID={`order-card-${order.id}`}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <ThemedText style={styles.orderNumber}>{order.orderId}</ThemedText>
          <ThemedText style={styles.productName} numberOfLines={2}>
            {order.productName}
          </ThemedText>
        </View>
        <ThemedText style={styles.orderPrice}>{formatInr(order.price)}</ThemedText>
      </View>
      <View style={styles.cardBottom}>
        <ThemedText style={styles.cardDetail}>{order.date}</ThemedText>
        <ThemedText style={styles.cardDot}>·</ThemedText>
        <ThemedText style={styles.cardDetail}>Qty {order.qty}</ThemedText>
      </View>
      <View style={styles.badgeRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <ThemedText style={[styles.statusText, { color: statusStyle.text }]}>
            {order.status}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: paymentStyle.bg }]}>
          <ThemedText style={[styles.statusText, { color: paymentStyle.text }]}>
            {order.paymentStatus}
          </ThemedText>
        </View>
      </View>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: 180, marginTop: LayoutSpacing.sm }]} />
      <View style={[styles.skeletonLine, { width: 120, marginTop: LayoutSpacing.sm }]} />
    </Card>
  );
}

export default function OrderHistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userOrders, ordersLoading, ordersError, refreshOrders } = useOrdersContext();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshOrders({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [refreshOrders]);

  useFocusEffect(
    useCallback(() => {
      void refreshOrders();
    }, [refreshOrders])
  );

  return (
    <PageLayout
      title="Order History"
      titleInHeader
      header="back"
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={Colors.light.accent}
          />
        ),
      }}
      contentContainerStyle={styles.list}
    >
      {ordersLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : ordersError ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={36} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>{ordersError}</ThemedText>
          <Pressable style={styles.retryBtn} onPress={() => void refreshOrders()}>
            <ThemedText style={styles.retryText}>Try again</ThemedText>
          </Pressable>
        </View>
      ) : userOrders.length > 0 ? (
        userOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onPress={() => navigation.navigate("OrderDetail", { orderId: order.id })}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Feather name="shopping-bag" size={36} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>
            {!isSupabaseConfigured()
              ? "Connect Supabase to view your order history."
              : "No orders yet. Shop the store to see your purchases here."}
          </ThemedText>
        </View>
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: LayoutSpacing.sm,
    paddingTop: LayoutSpacing.xs,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: LayoutSpacing.sm,
  },
  cardInfo: {
    flex: 1,
    paddingRight: LayoutSpacing.md,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textMuted,
    marginBottom: LayoutSpacing.xs,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.accent,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: LayoutSpacing.sm,
  },
  cardDetail: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  cardDot: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginHorizontal: LayoutSpacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    gap: LayoutSpacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: LayoutSpacing.xl,
    gap: LayoutSpacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: LayoutSpacing.sm,
    paddingHorizontal: LayoutSpacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.accent,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  skeletonLine: {
    height: 14,
    width: 140,
    borderRadius: 6,
    backgroundColor: Colors.light.backgroundSecondary,
  },
});
