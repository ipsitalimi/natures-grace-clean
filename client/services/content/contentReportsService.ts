import type {
  ContentReportStatus,
  ContentReportTargetType,
  FlaggedItem,
  ModerationQueueAction,
  ReportReason,
  SubmitContentReportInput,
} from "@/data/contentReports";
import { getSupabase } from "@/lib/supabase";
import * as discussionsService from "@/services/content/discussionsService";
import * as reviewsService from "@/services/content/reviewsService";
import { updateProfile } from "@/services/profileService";

export type DbContentReportRow = {
  id: string;
  reporter_id: string | null;
  reporter_name: string;
  target_type: ContentReportTargetType;
  target_id: string;
  reason: ReportReason;
  detail: string;
  content_preview: string;
  status: ContentReportStatus;
  moderation_action: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

function formatReportDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mapRow(row: DbContentReportRow): FlaggedItem {
  return {
    id: row.id,
    reporter: row.reporter_name,
    contentPreview: row.content_preview,
    reason: row.reason,
    date: formatReportDate(row.created_at),
    resolved: row.status !== "open",
    targetType: row.target_type,
    targetId: row.target_id,
  };
}

export async function fetchModerationQueue(): Promise<FlaggedItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("content_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[contentReportsService] fetch queue:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbContentReportRow[]).map(mapRow);
}

export async function fetchOpenReports(): Promise<FlaggedItem[]> {
  const all = await fetchModerationQueue();
  return all.filter((r) => !r.resolved);
}

export async function submitContentReport(
  input: SubmitContentReportInput,
  reporter?: { id?: string; name?: string }
): Promise<FlaggedItem | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reporterId = reporter?.id ?? user?.id ?? null;
  const reporterName =
    reporter?.name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Community member";

  const { data, error } = await supabase
    .from("content_reports")
    .insert({
      reporter_id: reporterId,
      reporter_name: reporterName,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
      detail: input.detail?.trim() ?? "",
      content_preview: input.contentPreview.trim().slice(0, 500),
      status: "open",
    })
    .select()
    .single();

  if (error) {
    console.error("[contentReportsService] submit:", error.message);
    return null;
  }

  return mapRow(data as DbContentReportRow);
}

async function resolveContentAuthorId(
  targetType: ContentReportTargetType,
  targetId: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (targetType === "discussion_thread") {
    const { data } = await supabase
      .from("discussion_threads")
      .select("author_id")
      .eq("id", targetId)
      .maybeSingle();
    return (data as { author_id?: string | null } | null)?.author_id ?? null;
  }

  if (targetType === "discussion_reply") {
    const { data } = await supabase
      .from("discussion_replies")
      .select("author_id")
      .eq("id", targetId)
      .maybeSingle();
    return (data as { author_id?: string | null } | null)?.author_id ?? null;
  }

  if (targetType === "review") {
    const { data } = await supabase
      .from("reviews")
      .select("user_id")
      .eq("id", targetId)
      .maybeSingle();
    return (data as { user_id?: string | null } | null)?.user_id ?? null;
  }

  return null;
}

async function suspendContentAuthor(
  targetType: ContentReportTargetType,
  targetId: string
): Promise<void> {
  const authorId = await resolveContentAuthorId(targetType, targetId);
  if (!authorId) return;
  await updateProfile(authorId, { status: "Suspended" });
}

async function applyTargetModeration(
  targetType: ContentReportTargetType,
  targetId: string,
  action: ModerationQueueAction
): Promise<void> {
  if (action === "dismiss") return;

  if (targetType === "discussion_thread") {
    if (action === "remove_content" || action === "ban_reporter") {
      await discussionsService.updateThreadModeration(targetId, {
        moderationStatus: "Removed",
        visibility: "Hidden",
      });
    }
    return;
  }

  if (targetType === "discussion_reply") {
    if (action === "remove_content" || action === "ban_reporter") {
      await discussionsService.updateReplyModeration(targetId, "Removed");
    }
    return;
  }

  if (targetType === "review") {
    if (action === "remove_content" || action === "ban_reporter") {
      await reviewsService.updateReviewStatus(targetId, "Flagged");
    }
  }
}

export async function applyModerationAction(
  reportId: string,
  action: ModerationQueueAction,
  moderatorId?: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data: row, error: fetchError } = await supabase
    .from("content_reports")
    .select("*")
    .eq("id", reportId)
    .maybeSingle();

  if (fetchError || !row) {
    console.error("[contentReportsService] fetch report:", fetchError?.message);
    return false;
  }

  const report = row as DbContentReportRow;

  if (action === "remove_content" || action === "ban_reporter") {
    await applyTargetModeration(report.target_type, report.target_id, action);
    if (action === "ban_reporter") {
      await suspendContentAuthor(report.target_type, report.target_id);
    }
  }

  const status: ContentReportStatus =
    action === "dismiss" ? "dismissed" : "actioned";

  const { error } = await supabase
    .from("content_reports")
    .update({
      status,
      moderation_action: action,
      resolved_by: moderatorId ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    console.error("[contentReportsService] apply action:", error.message);
    return false;
  }

  return true;
}

export async function createReportForReview(
  reviewId: string,
  preview: string,
  reporterName = "Admin"
): Promise<FlaggedItem | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("content_reports")
    .select("id")
    .eq("target_type", "review")
    .eq("target_id", reviewId)
    .eq("status", "open")
    .maybeSingle();

  if (existing) {
    const queue = await fetchModerationQueue();
    return queue.find((r) => r.id === (existing as { id: string }).id) ?? null;
  }

  return submitContentReport(
    {
      targetType: "review",
      targetId: reviewId,
      reason: "Inappropriate",
      contentPreview: preview,
      detail: "Flagged from admin reviews moderation",
    },
    { name: reporterName }
  );
}

export async function countContentReports(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("content_reports")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
