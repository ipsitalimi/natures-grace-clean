import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useOrdersContext } from "@/context/OrdersContext";
import type { SellerOrder } from "@/data/orders";
import { getOrderStatusColor, getPaymentStatusColor } from "@/data/orders";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
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
    <Pressable style={styles.card} onPress={onPress} testID={`order-card-${order.id}`}>
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
    </Pressable>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: 180, marginTop: 8 }]} />
      <View style={[styles.skeletonLine, { width: 120, marginTop: 8 }]} />
    </View>
  );
}

export default function OrderHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [drawerVisible, setDrawerVisible] = useState(false);
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
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
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
        <ThemedText style={styles.pageTitle}>Order History</ThemedText>
      </View>

      {ordersLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : ordersError ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={36} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>{ordersError}</ThemedText>
          <Pressable style={styles.retryBtn} onPress={() => void refreshOrders()}>
            <ThemedText style={styles.retryText}>Try again</ThemedText>
          </Pressable>
        </View>
      ) : userOrders.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: getScrollBottomPadding(insets.bottom, 24) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Colors.light.accent}
            />
          }
        >
          {userOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => navigation.navigate("OrderDetail", { orderId: order.id })}
            />
          ))}
        </ScrollView>
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
    gap: 10,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    gap: 10,
    paddingTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  cardInfo: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textMuted,
    marginBottom: 4,
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
    marginBottom: Spacing.sm,
  },
  cardDetail: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  cardDot: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginHorizontal: 4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
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
