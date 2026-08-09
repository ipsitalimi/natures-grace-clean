/** Content moderation reports (maps to `content_reports` table). */

export type ReportReason = "Spam" | "Inappropriate" | "Misleading" | "Other";

export type ContentReportTargetType =
  | "discussion_thread"
  | "discussion_reply"
  | "review"
  | "gratitude"
  | "event"
  | "product"
  | "other";

export type ContentReportStatus = "open" | "dismissed" | "actioned";

export type ModerationQueueAction = "dismiss" | "remove_content" | "ban_reporter";

/** Admin Community flagged card shape (existing UI). */
export interface FlaggedItem {
  id: string;
  reporter: string;
  contentPreview: string;
  reason: ReportReason;
  date: string;
  resolved: boolean;
  targetType: ContentReportTargetType;
  targetId: string;
}

export interface SubmitContentReportInput {
  targetType: ContentReportTargetType;
  targetId: string;
  reason: ReportReason;
  contentPreview: string;
  detail?: string;
}
