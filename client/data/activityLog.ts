/** Admin activity log (maps to `activity_log` table). */

export type ActivityLogActionType =
  | "booking"
  | "user"
  | "review"
  | "event"
  | "store"
  | "settings";

export interface ActivityLogEntry {
  id: string;
  type: ActivityLogActionType;
  description: string;
  timeAgo: string;
  actorName?: string;
  targetType?: string | null;
  targetId?: string | null;
  createdAt?: string;
}

export interface LogActivityOptions {
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  actorName?: string;
}
