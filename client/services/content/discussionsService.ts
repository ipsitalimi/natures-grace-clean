import type {
  Discussion,
  DiscussionModerationStatus,
  DiscussionReply,
  DiscussionVisibility,
} from "@/data/discussions";
import { getSupabase } from "@/lib/supabase";

export type DbThreadRow = {
  id: string;
  title: string;
  question: string;
  author_id: string | null;
  author_name: string;
  visibility: DiscussionVisibility;
  moderation_status: DiscussionModerationStatus;
  created_at: string;
  updated_at: string;
};

export type DbReplyRow = {
  id: string;
  thread_id: string;
  parent_reply_id: string | null;
  author_id: string | null;
  author_name: string;
  body: string;
  moderation_status: DiscussionModerationStatus;
  created_at: string;
  updated_at: string;
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

function formatDiscussionDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  ) {
    return "Today";
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function mapReply(row: DbReplyRow): DiscussionReply {
  return {
    id: row.id,
    author: row.author_name,
    text: row.body,
    timeAgo: formatRelativeTime(row.created_at),
    moderationStatus: row.moderation_status,
    parentReplyId: row.parent_reply_id,
    createdAt: row.created_at,
  };
}

function mapThread(row: DbThreadRow, replies: DbReplyRow[]): Discussion {
  return {
    id: row.id,
    title: row.title,
    question: row.question,
    date: formatDiscussionDate(row.created_at),
    replies: replies.map(mapReply),
    authorName: row.author_name,
    visibility: row.visibility,
    moderationStatus: row.moderation_status,
    createdAt: row.created_at,
  };
}

export async function fetchDiscussions(options?: {
  forModeration?: boolean;
}): Promise<Discussion[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let threadQuery = supabase
    .from("discussion_threads")
    .select("*")
    .order("created_at", { ascending: false });

  if (!options?.forModeration) {
    threadQuery = threadQuery
      .eq("visibility", "Visible")
      .eq("moderation_status", "Approved");
  } else {
    threadQuery = threadQuery.neq("moderation_status", "Removed");
  }

  const { data: threads, error: threadError } = await threadQuery;
  if (threadError) {
    console.error("[discussionsService] fetch threads:", threadError.message);
    throw new Error(threadError.message);
  }

  if (!threads?.length) return [];

  const threadIds = threads.map((t) => (t as DbThreadRow).id);
  const { data: replies, error: replyError } = await supabase
    .from("discussion_replies")
    .select("*")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: true });

  if (replyError) {
    console.error("[discussionsService] fetch replies:", replyError.message);
    throw new Error(replyError.message);
  }

  const repliesByThread = new Map<string, DbReplyRow[]>();
  for (const r of (replies ?? []) as DbReplyRow[]) {
    if (!options?.forModeration && r.moderation_status !== "Approved") continue;
    if (options?.forModeration && r.moderation_status === "Removed") continue;
    const list = repliesByThread.get(r.thread_id) ?? [];
    list.push(r);
    repliesByThread.set(r.thread_id, list);
  }

  return (threads as DbThreadRow[]).map((t) =>
    mapThread(t, repliesByThread.get(t.id) ?? [])
  );
}

export async function insertThread(input: {
  title: string;
  question: string;
  authorId?: string;
  authorName: string;
}): Promise<Discussion | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("discussion_threads")
    .insert({
      title: input.title.trim(),
      question: input.question.trim(),
      author_id: input.authorId ?? null,
      author_name: input.authorName,
      visibility: "Visible",
      moderation_status: "Pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[discussionsService] insert thread:", error.message);
    return null;
  }

  return mapThread(data as DbThreadRow, []);
}

export async function insertReply(input: {
  threadId: string;
  body: string;
  authorId?: string;
  authorName: string;
  parentReplyId?: string | null;
}): Promise<DiscussionReply | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("discussion_replies")
    .insert({
      thread_id: input.threadId,
      parent_reply_id: input.parentReplyId ?? null,
      author_id: input.authorId ?? null,
      author_name: input.authorName,
      body: input.body.trim(),
      moderation_status: "Approved",
    })
    .select()
    .single();

  if (error) {
    console.error("[discussionsService] insert reply:", error.message);
    return null;
  }

  return mapReply(data as DbReplyRow);
}

export async function updateThreadModeration(
  threadId: string,
  patch: {
    moderationStatus?: DiscussionModerationStatus;
    visibility?: DiscussionVisibility;
  }
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const row: Partial<DbThreadRow> = {};
  if (patch.moderationStatus) row.moderation_status = patch.moderationStatus;
  if (patch.visibility) row.visibility = patch.visibility;

  const { error } = await supabase
    .from("discussion_threads")
    .update(row)
    .eq("id", threadId);

  if (error) {
    console.error("[discussionsService] update thread:", error.message);
    return false;
  }
  return true;
}

export async function updateReplyModeration(
  replyId: string,
  moderationStatus: DiscussionModerationStatus
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("discussion_replies")
    .update({ moderation_status: moderationStatus })
    .eq("id", replyId);

  if (error) {
    console.error("[discussionsService] update reply:", error.message);
    return false;
  }
  return true;
}

export async function countDiscussionThreads(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("discussion_threads")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
