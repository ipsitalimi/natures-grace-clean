import type {
  ActivityLogActionType,
  ActivityLogEntry,
  LogActivityOptions,
} from "@/data/activityLog";
import { getSupabase } from "@/lib/supabase";

export type DbActivityLogRow = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action_type: ActivityLogActionType;
  description: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  created_at: string;
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function mapRow(row: DbActivityLogRow): ActivityLogEntry {
  return {
    id: row.id,
    type: row.action_type,
    description: row.description,
    timeAgo: formatRelativeTime(row.created_at),
    actorName: row.actor_name,
    targetType: row.target_type,
    targetId: row.target_id,
    createdAt: row.created_at,
  };
}

async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return false;
  return (data as { role?: string } | null)?.role === "Admin";
}

export async function fetchActivityLog(limit = 50): Promise<ActivityLogEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return [];

  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[activityLogService] fetch:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbActivityLogRow[]).map(mapRow);
}

export async function insertActivityLog(
  actionType: ActivityLogActionType,
  description: string,
  options?: LogActivityOptions
): Promise<ActivityLogEntry | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const actorName =
    options?.actorName?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Admin";

  const { data, error } = await supabase
    .from("activity_log")
    .insert({
      actor_id: user?.id ?? null,
      actor_name: actorName,
      action_type: actionType,
      description: description.trim(),
      target_type: options?.targetType ?? null,
      target_id: options?.targetId ?? null,
      metadata: options?.metadata ?? {},
      before_snapshot: options?.beforeSnapshot ?? null,
      after_snapshot: options?.afterSnapshot ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[activityLogService] insert:", error.message);
    return null;
  }

  return mapRow(data as DbActivityLogRow);
}

export async function countActivityLog(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("activity_log")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
