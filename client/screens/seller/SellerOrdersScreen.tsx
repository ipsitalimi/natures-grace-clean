import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import {
  sellerOrders,
  getOrderStatusColor,
  getPaymentStatusColor,
  type OrderStatus,
  type SellerOrder,
} from "@/data/sellerMockData";

const TABS: OrderStatus[] = ["Pending", "Packed", "Shipped", "Delivered", "Cancelled"];

function EmptyState({ status }: { status: OrderStatus }) {
  const messages: Record<OrderStatus, string> = {
    Pending: "No pending orders — enjoy the calm.",
    Packed: "Nothing packed yet. Orders will appear here once confirmed.",
    Shipped: "No shipments in transit right now.",
    Delivered: "Your delivered orders will appear here.",
    Cancelled: "No cancelled orders — that's a great sign.",
  };
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <Feather name="inbox" size={28} color={Colors.light.textMuted} />
      </View>
      <ThemedText style={styles.emptyTitle}>
        {status === "Pending" ? "Your mindful marketplace journey starts here." : "All clear here."}
      </ThemedText>
      <ThemedText style={styles.emptySubtitle}>{messages[status]}</ThemedText>
    </View>
  );
}

function OrderCard({ order }: { order: SellerOrder }) {
  const statusColor = getOrderStatusColor(order.status);
  const payColor = getPaymentStatusColor(order.paymentStatus);

  return (
    <View style={styles.orderCard} testID={`order-card-${order.id}`}>
      <View style={styles.orderTopRow}>
        <View style={styles.orderProductThumb}>
          <Feather name="package" size={20} color={Colors.light.textMuted} />
        </View>
        <View style={styles.orderInfo}>
          <View style={styles.orderIdRow}>
            <ThemedText style={styles.orderId}>{order.orderId}</ThemedText>
            <ThemedText style={styles.orderDate}>{order.date}</ThemedText>
          </View>
          <ThemedText style={styles.customerName}>{order.customerName}</ThemedText>
          <ThemedText style={styles.productName} numberOfLines={1}>
            {order.productName}
          </ThemedText>
        </View>
      </View>

      <View style={styles.orderBottomRow}>
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <ThemedText style={[styles.badgeText, { color: statusColor.text }]}>
              {order.status}
            </ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: payColor.bg }]}>
            <ThemedText style={[styles.badgeText, { color: payColor.text }]}>
              {order.paymentStatus}
            </ThemedText>
          </View>
          {order.qty > 1 ? (
            <View style={[styles.badge, { backgroundColor: `${Colors.light.accent}10` }]}>
              <ThemedText style={[styles.badgeText, { color: Colors.light.accent }]}>
                Qty: {order.qty}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText style={styles.orderPrice}>Rs. {order.price.toLocaleString()}</ThemedText>
      </View>
    </View>
  );
}

export default function SellerOrdersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<OrderStatus>("Pending");

  const filteredOrders = sellerOrders.filter((o) => o.status === activeTab);
  const counts = TABS.reduce((acc, tab) => {
    acc[tab] = sellerOrders.filter((o) => o.status === tab).length;
    return acc;
  }, {} as Record<OrderStatus, number>);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} testID="button-back">
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Orders</ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            testID={`tab-${tab.toLowerCase()}`}
          >
            <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </ThemedText>
            {counts[tab] > 0 ? (
              <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                <ThemedText style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>
                  {counts[tab]}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={[
          styles.listContent,
          filteredOrders.length === 0 && styles.listEmpty,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState status={activeTab} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  tabsScrollView: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.light.divider}30`,
  },
  tabsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: 0,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.light.accent,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  tabTextActive: {
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  tabBadge: {
    backgroundColor: `${Colors.light.accent}15`,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeActive: {
    backgroundColor: Colors.light.accent,
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  tabBadgeTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  listEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  orderCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  orderTopRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  orderProductThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: `${Colors.light.accent}08`,
    justifyContent: "center",
    alignItems: "center",
  },
  orderInfo: {
    flex: 1,
    gap: 3,
  },
  orderIdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  orderDate: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  customerName: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  productName: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
  },
  orderBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
  orderPrice: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginLeft: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    textAlign: "center",
    fontStyle: "italic",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
