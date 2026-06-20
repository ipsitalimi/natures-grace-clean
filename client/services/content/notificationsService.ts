import { getSupabase } from "@/lib/supabase";
import type { NotificationItem } from "@/data/mockNotifications";
import { notificationRowToItem, type DbNotificationRow } from "@/services/content/types";

type DbNotificationReadRow = {
  notification_id: string;
};

function mapNotificationsWithReadState(
  rows: DbNotificationRow[],
  userId: string,
  broadcastReadIds: Set<string>
): NotificationItem[] {
  return rows.map((row) => {
    const item = notificationRowToItem(row);
    if (row.user_id === userId) {
      return item;
    }
    if (row.user_id === null) {
      return { ...item, unread: !broadcastReadIds.has(row.id) };
    }
    return item;
  });
}

async function fetchBroadcastReadIds(userId: string): Promise<Set<string>> {
  const supabase = getSupabase();
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", userId);

  if (error) {
    console.error("[notificationsService] fetch broadcast reads:", error.message);
    return new Set();
  }

  return new Set(
    ((data ?? []) as DbNotificationReadRow[]).map((row) => row.notification_id)
  );
}

async function markBroadcastRead(userId: string, notificationId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from("notification_reads").upsert(
    {
      user_id: userId,
      notification_id: notificationId,
      read_at: new Date().toISOString(),
    },
    { onConflict: "user_id,notification_id" }
  );

  if (error) {
    console.error("[notificationsService] mark broadcast read:", error.message);
    return false;
  }
  return true;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[notificationsService] fetch:", error.message);
    return [];
  }
  return ((data ?? []) as DbNotificationRow[]).map(notificationRowToItem);
}

/** Broadcasts (user_id null) plus notifications addressed to the signed-in user. */
export async function fetchMyNotifications(): Promise<NotificationItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[notificationsService] fetch mine:", error.message);
    return [];
  }
  const broadcastReadIds = await fetchBroadcastReadIds(user.id);
  return mapNotificationsWithReadState(
    (data ?? []) as DbNotificationRow[],
    user.id,
    broadcastReadIds
  );
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: row, error: fetchError } = await supabase
    .from("notifications")
    .select("id, user_id")
    .eq("id", notificationId)
    .maybeSingle();

  if (fetchError || !row) {
    if (fetchError) console.error("[notificationsService] mark read lookup:", fetchError.message);
    return false;
  }

  if (row.user_id === null) {
    return markBroadcastRead(user.id, notificationId);
  }

  if (row.user_id !== user.id) {
    return false;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[notificationsService] mark read:", error.message);
    return false;
  }
  return true;
}

export async function markAllMyNotificationsRead(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error: directError } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (directError) {
    console.error("[notificationsService] mark all read:", directError.message);
    return false;
  }

  const { data: broadcasts, error: broadcastError } = await supabase
    .from("notifications")
    .select("id")
    .is("user_id", null);

  if (broadcastError) {
    console.error("[notificationsService] mark all broadcast lookup:", broadcastError.message);
    return false;
  }

  const broadcastReadIds = await fetchBroadcastReadIds(user.id);
  const unreadBroadcasts = (broadcasts ?? []).filter((row) => !broadcastReadIds.has(row.id));

  if (unreadBroadcasts.length > 0) {
    const { error: insertError } = await supabase.from("notification_reads").upsert(
      unreadBroadcasts.map((row) => ({
        user_id: user.id,
        notification_id: row.id,
        read_at: new Date().toISOString(),
      })),
      { onConflict: "user_id,notification_id" }
    );

    if (insertError) {
      console.error("[notificationsService] mark all broadcast reads:", insertError.message);
      return false;
    }
  }

  return true;
}

export async function insertBroadcast(
  message: string,
  options?: { linkRoute?: string | null; linkTargetId?: string | null }
): Promise<NotificationItem | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      message,
      user_id: null,
      is_read: false,
      link_route: options?.linkRoute ?? null,
      link_target_id: options?.linkTargetId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[notificationsService] insert:", error.message);
    return null;
  }
  return notificationRowToItem(data as DbNotificationRow);
}

export type NotificationAudience = "All Users" | "Practitioners" | "Sellers";

export async function insertNotificationForAudience(
  message: string,
  audience: NotificationAudience,
  options?: { linkRoute?: string | null; linkTargetId?: string | null }
): Promise<NotificationItem[]> {
  if (audience === "All Users") {
    const created = await insertBroadcast(message, options);
    return created ? [created] : [];
  }

  const supabase = getSupabase();
  if (!supabase) return [];

  const role = audience === "Practitioners" ? "Practitioner" : "Seller";
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", role);

  if (profilesError || !profiles?.length) {
    console.error("[notificationsService] audience profiles:", profilesError?.message);
    return [];
  }

  const rows = profiles.map((profile) => ({
    message,
    user_id: profile.id,
    is_read: false,
    link_route: options?.linkRoute ?? null,
    link_target_id: options?.linkTargetId ?? null,
  }));

  const { data, error } = await supabase.from("notifications").insert(rows).select();
  if (error) {
    console.error("[notificationsService] audience insert:", error.message);
    return [];
  }

  return ((data ?? []) as DbNotificationRow[]).map(notificationRowToItem);
}

export async function countNotifications(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
