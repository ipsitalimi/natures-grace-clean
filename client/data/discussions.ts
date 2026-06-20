/** Community discussion types (Supabase-backed). */

export type DiscussionModerationStatus = "Approved" | "Pending" | "Flagged" | "Removed";
export type DiscussionVisibility = "Visible" | "Hidden";

export interface DiscussionReply {
  id: string;
  author: string;
  text: string;
  timeAgo: string;
  moderationStatus: DiscussionModerationStatus;
  parentReplyId?: string | null;
  createdAt?: string;
}

export interface Discussion {
  id: string;
  title: string;
  question: string;
  date: string;
  replies: DiscussionReply[];
  authorName: string;
  visibility: DiscussionVisibility;
  moderationStatus: DiscussionModerationStatus;
  createdAt?: string;
}

export function isDiscussionPublic(d: Discussion): boolean {
  return d.visibility === "Visible" && d.moderationStatus === "Approved";
}

export function publicReplies(replies: DiscussionReply[]): DiscussionReply[] {
  return replies.filter((r) => r.moderationStatus === "Approved");
}
