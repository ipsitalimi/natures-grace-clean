import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useAuth } from "@/context/AuthContext";
import { NotificationItem } from "@/types/notifications";
import { getHeaderPaddingTop, getScrollBottomPadding } from "@/lib/layoutInsets";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as notificationsService from "@/services/content/notificationsService";

function NotificationCard({
  notification,
  onPress,
}: {
  notification: NotificationItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.card, notification.unread && styles.cardUnread]}
      onPress={onPress}
      testID={`notification-card-${notification.id}`}
    >
      <View style={styles.cardContent}>
        {notification.unread ? <View style={styles.unreadDot} /> : null}
        <View style={styles.cardText}>
          <ThemedText style={styles.message}>{notification.message}</ThemedText>
          <ThemedText style={styles.time}>{notification.time}</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { session } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (options?: { silent?: boolean }) => {
    if (!isSupabaseConfigured()) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (!session?.user) {
      setNotifications([]);
      setLoading(false);
      setError("Sign in to view your notifications.");
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const rows = await notificationsService.fetchMyNotifications();
      setNotifications(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications");
      setNotifications([]);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [session?.user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadNotifications({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadNotifications]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  const handlePress = async (notification: NotificationItem) => {
    if (notification.unread) {
      const ok = await notificationsService.markNotificationRead(notification.id);
      if (ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, unread: false } : n))
        );
      }
    }

    const route = notification.linkRoute;
    const targetId = notification.linkTargetId;
    if (!route) return;

    switch (route) {
      case "SessionHistory":
        navigation.navigate("SessionHistory" as never);
        break;
      case "SessionDetail":
        if (targetId) (navigation as any).navigate("SessionDetail", { sessionId: targetId });
        break;
      case "OrderHistory":
        navigation.navigate("OrderHistory" as never);
        break;
      case "OrderDetail":
        if (targetId) (navigation as any).navigate("OrderDetail", { orderId: targetId });
        break;
      case "SellerOnboarding":
        navigation.navigate("SellerOnboarding" as never);
        break;
      case "SellerMain":
        navigation.navigate("SellerMain" as never);
        break;
      case "PractitionerMain":
        navigation.navigate("PractitionerMain" as never);
        break;
      case "ApplicationStatus":
        navigation.navigate("ApplicationStatus" as never);
        break;
      case "Main":
        navigation.navigate("Main" as never);
        break;
      default:
        break;
    }
  };

  const handleMarkAllRead = async () => {
    await notificationsService.markAllMyNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <View style={styles.container}>
      <ProfileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.headerRow, { paddingTop: getHeaderPaddingTop(insets.top) }]}>
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.headerCenter} />
        {unreadCount > 0 ? (
          <Pressable style={styles.headerIconButton} onPress={() => void handleMarkAllRead()}>
            <ThemedText style={styles.markAllText}>Mark all</ThemedText>
          </Pressable>
        ) : (
          <View style={styles.headerIconButton} />
        )}
      </View>

      <View style={styles.titleSection}>
        <ThemedText style={styles.pageTitle}>Notifications</ThemedText>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.emptyText}>Loading notifications…</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={36} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>{error}</ThemedText>
          <Pressable style={styles.retryBtn} onPress={() => void loadNotifications()}>
            <ThemedText style={styles.retryText}>Try again</ThemedText>
          </Pressable>
        </View>
      ) : notifications.length > 0 ? (
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
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onPress={() => void handlePress(notification)}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="bell-off" size={36} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>Nothing here yet.</ThemedText>
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
    minWidth: 40,
    alignItems: "flex-end",
  },
  headerCenter: {
    flex: 1,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
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
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  cardUnread: {
    backgroundColor: `${Colors.light.accent}08`,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.accent,
    marginTop: 5,
    marginRight: 10,
  },
  cardText: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  time: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 4,
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
});
