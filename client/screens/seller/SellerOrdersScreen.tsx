import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import { formatInr } from "@/lib/formatCurrency";
import {
  getOrderStatusColor,
  getPaymentStatusColor,
  getNextOrderStatus,
  getOrderAdvanceConfirmMessage,
  type OrderStatus,
  type SellerOrder,
} from "@/data/orders";
import { useOrdersContext } from "@/context/OrdersContext";

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

function OrderCard({
  order,
  onAdvanceStatus,
}: {
  order: SellerOrder;
  onAdvanceStatus: () => void;
}) {
  const statusColor = getOrderStatusColor(order.status);
  const payColor = getPaymentStatusColor(order.paymentStatus);
  const nextStatus = getNextOrderStatus(order.status);
  const canAdvance = nextStatus !== null;

  return (
    <Pressable
      style={styles.orderCard}
      onPress={canAdvance ? onAdvanceStatus : undefined}
      testID={`order-card-${order.id}`}
    >
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
        <ThemedText style={styles.orderPrice}>{formatInr(order.price)}</ThemedText>
      </View>

      {canAdvance ? (
        <View style={styles.advanceHint}>
          <Feather name="chevron-right" size={14} color={Colors.light.accent} />
          <ThemedText style={styles.advanceHintText}>
            Tap to mark as {nextStatus.toLowerCase()}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

function ShipOrderModal({
  order,
  visible,
  submitting,
  shipError,
  courier,
  trackingNumber,
  onCourierChange,
  onTrackingChange,
  onCancel,
  onConfirm,
}: {
  order: SellerOrder | null;
  visible: boolean;
  submitting: boolean;
  shipError: string;
  courier: string;
  trackingNumber: string;
  onCourierChange: (v: string) => void;
  onTrackingChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.modalBackdrop} onPress={onCancel} />
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
          <ThemedText style={styles.modalTitle}>Mark as shipped</ThemedText>
          <ThemedText style={styles.modalSubtitle}>
            Order {order?.orderId} — add tracking so the buyer can follow delivery.
          </ThemedText>

          <ThemedText style={styles.fieldLabel}>Courier</ThemedText>
          <TextInput
            style={styles.modalInput}
            value={courier}
            onChangeText={onCourierChange}
            placeholder="e.g. Delhivery, Blue Dart"
            placeholderTextColor={Colors.light.textMuted}
            testID="input-ship-courier"
          />

          <ThemedText style={styles.fieldLabel}>Tracking number</ThemedText>
          <TextInput
            style={styles.modalInput}
            value={trackingNumber}
            onChangeText={onTrackingChange}
            placeholder="Required"
            placeholderTextColor={Colors.light.textMuted}
            autoCapitalize="characters"
            testID="input-ship-tracking"
          />

          {shipError ? <ThemedText style={styles.modalError}>{shipError}</ThemedText> : null}

          <View style={styles.modalActions}>
            <Pressable style={styles.modalCancelBtn} onPress={onCancel} disabled={submitting}>
              <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modalConfirmBtn, submitting && styles.modalConfirmDisabled]}
              onPress={onConfirm}
              disabled={submitting}
              testID="button-confirm-ship"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText style={styles.modalConfirmText}>Mark shipped</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function SellerOrdersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<OrderStatus>("Pending");
  const { orders, advanceOrderStatus, ordersLoading } = useOrdersContext();
  const [shipOrder, setShipOrder] = useState<SellerOrder | null>(null);
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shipError, setShipError] = useState("");
  const [shipSubmitting, setShipSubmitting] = useState(false);

  const filteredOrders = orders.filter((o) => o.status === activeTab);
  const counts = TABS.reduce((acc, tab) => {
    acc[tab] = orders.filter((o) => o.status === tab).length;
    return acc;
  }, {} as Record<OrderStatus, number>);

  const closeShipModal = () => {
    setShipOrder(null);
    setCourier("");
    setTrackingNumber("");
    setShipError("");
    setShipSubmitting(false);
  };

  const handleAdvanceRequest = (order: SellerOrder) => {
    const next = getNextOrderStatus(order.status);
    if (!next) return;

    if (next === "Shipped") {
      setShipOrder(order);
      setCourier("");
      setTrackingNumber("");
      setShipError("");
      return;
    }

    Alert.alert(
      "Update order",
      getOrderAdvanceConfirmMessage(order.orderId, next),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            void advanceOrderStatus(order.id);
          },
        },
      ]
    );
  };

  const handleConfirmShip = async () => {
    if (!shipOrder || shipSubmitting) return;
    if (!trackingNumber.trim()) {
      setShipError("Enter a tracking number before marking as shipped.");
      return;
    }
    setShipSubmitting(true);
    setShipError("");
    await advanceOrderStatus(shipOrder.id, {
      courier: courier.trim() || undefined,
      trackingNumber: trackingNumber.trim(),
    });
    closeShipModal();
  };

  return (
    <View style={[styles.container, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
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
                <ThemedText
                  style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}
                >
                  {counts[tab]}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      {ordersLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.loadingText}>Loading orders…</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard order={item} onAdvanceStatus={() => handleAdvanceRequest(item)} />
          )}
          contentContainerStyle={[
            styles.listContent,
            filteredOrders.length === 0 && styles.listEmpty,
            { paddingBottom: getScrollBottomPadding(insets.bottom, 24) },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState status={activeTab} />}
        />
      )}

      <ShipOrderModal
        order={shipOrder}
        visible={shipOrder !== null}
        submitting={shipSubmitting}
        shipError={shipError}
        courier={courier}
        trackingNumber={trackingNumber}
        onCourierChange={setCourier}
        onTrackingChange={setTrackingNumber}
        onCancel={closeShipModal}
        onConfirm={() => void handleConfirmShip()}
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
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: Spacing["2xl"],
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textMuted,
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
  advanceHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: `${Colors.light.divider}40`,
  },
  advanceHintText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.accent,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalCard: {
    backgroundColor: Colors.light.backgroundRoot,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginTop: Spacing.xs,
  },
  modalInput: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  modalError: {
    fontSize: 13,
    color: "#C0392B",
    marginTop: Spacing.xs,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.button,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  modalConfirmDisabled: {
    opacity: 0.7,
  },
  modalConfirmText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
