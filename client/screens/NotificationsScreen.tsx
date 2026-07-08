import React, { useCallback, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { PageLayout, Card } from "@/components/layout";
import { LayoutSpacing } from "@/constants/layout";
import { Colors, BorderRadius } from "@/constants/theme";
import { useAuth, homeRouteForRole } from "@/context/AuthContext";
import { NotificationItem } from "@/types/notifications";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { navigateFromNotificationLink } from "@/lib/notificationNavigation";
import * as notificationsService from "@/services/content/notificationsService";

function NotificationCard({
  notification,
  onPress,
}: {
  notification: NotificationItem;
  onPress: () => void;
}) {
  return (
    <Card
      onPress={onPress}
      style={notification.unread ? styles.cardUnread : undefined}
      testID={`notification-card-${notification.id}`}
    >
      <View style={styles.cardContent}>
        {notification.unread ? <View style={styles.unreadDot} /> : null}
        <View style={styles.cardText}>
          <ThemedText style={styles.message}>{notification.message}</ThemedText>
          <ThemedText style={styles.time}>{notification.time}</ThemedText>
        </View>
      </View>
    </Card>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { session, profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

    navigateFromNotificationLink(
      navigation as { navigate: (...args: never[]) => void },
      route,
      targetId,
      profile?.role
    );
  };

  const handleMarkAllRead = async () => {
    setActionError(null);
    const ok = await notificationsService.markAllMyNotificationsRead();
    if (!ok) {
      setActionError("Could not mark all as read. Please try again.");
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <PageLayout
      title="Notifications"
      titleInHeader
      header="back"
      headerProps={{
        showNotifications: false,
        rightAction: unreadCount > 0 ? (
          <Pressable style={styles.markAllButton} onPress={() => void handleMarkAllRead()}>
            <ThemedText style={styles.markAllText}>Mark all</ThemedText>
          </Pressable>
        ) : undefined,
      }}
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
      {actionError ? (
        <ThemedText style={styles.actionError}>{actionError}</ThemedText>
      ) : null}
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
        notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onPress={() => void handlePress(notification)}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Feather name="bell-off" size={36} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>Nothing here yet.</ThemedText>
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
  markAllButton: {
    padding: LayoutSpacing.sm,
    minWidth: 40,
    alignItems: "flex-end",
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.accent,
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
    marginBottom: LayoutSpacing.xs,
  },
  time: {
    fontSize: 13,
    color: Colors.light.textSecondary,
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
    marginTop: LayoutSpacing.xs,
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
  actionError: {
    fontSize: 13,
    color: "#8B3A3A",
    textAlign: "center",
    marginBottom: LayoutSpacing.sm,
  },
});
