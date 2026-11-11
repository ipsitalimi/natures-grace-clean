import type { SupabaseClient } from "@supabase/supabase-js";
import { insertUserNotification, type UserNotificationLinkRoute } from "./userNotifications";
import { sendEmailToUserId, sendTransactionalEmail, type EmailTemplateId } from "./email/emailService";

export type NotificationCategory =
  | "booking_reminders"
  | "order_updates"
  | "community_activity"
  | "promotions"
  | "platform_announcements";

export type NotificationEvent =
  | "booking_reminder"
  | "booking_confirmed"
  | "booking_cancelled"
  | "order_confirmed"
  | "order_shipped"
  | "order_delivered"
  | "practitioner_approved"
  | "seller_approved"
  | "application_rejected"
  | "refund_approved"
  | "refund_rejected"
  | "withdrawal_received"
  | "withdrawal_completed"
  | "application_submitted";

const EVENT_CATEGORY: Record<NotificationEvent, NotificationCategory> = {
  booking_reminder: "booking_reminders",
  booking_confirmed: "booking_reminders",
  booking_cancelled: "booking_reminders",
  order_confirmed: "order_updates",
  order_shipped: "order_updates",
  order_delivered: "order_updates",
  practitioner_approved: "platform_announcements",
  seller_approved: "platform_announcements",
  application_rejected: "platform_announcements",
  refund_approved: "order_updates",
  refund_rejected: "order_updates",
  withdrawal_received: "order_updates",
  withdrawal_completed: "order_updates",
  application_submitted: "platform_announcements",
};

const EVENT_EMAIL: Partial<Record<NotificationEvent, EmailTemplateId>> = {
  booking_reminder: "booking_reminder",
  booking_confirmed: "booking_confirmed",
  booking_cancelled: "booking_cancelled",
  order_confirmed: "order_confirmed",
  order_shipped: "order_shipped",
  order_delivered: "order_delivered",
  practitioner_approved: "practitioner_approved",
  seller_approved: "seller_approved",
  application_rejected: "practitioner_rejected",
  refund_approved: "refund_approved",
  withdrawal_received: "withdrawal_received",
  withdrawal_completed: "withdrawal_completed",
};

type ProfilePrefs = {
  notificationsEnabled?: boolean;
  bookingReminders?: boolean;
  orderUpdates?: boolean;
  communityActivity?: boolean;
  promotions?: boolean;
  platformAnnouncements?: boolean;
};

function parsePrefs(raw: unknown): ProfilePrefs {
  if (!raw || typeof raw !== "object") return {};
  return raw as ProfilePrefs;
}

function categoryAllowed(prefs: ProfilePrefs, category: NotificationCategory): boolean {
  if (prefs.notificationsEnabled === false) return false;
  switch (category) {
    case "booking_reminders":
      return prefs.bookingReminders !== false;
    case "order_updates":
      return prefs.orderUpdates !== false;
    case "community_activity":
      return prefs.communityActivity !== false;
    case "promotions":
      return prefs.promotions !== false;
    case "platform_announcements":
      return prefs.platformAnnouncements !== false;
    default:
      return true;
  }
}

export async function dispatchUserNotification(
  supabase: SupabaseClient,
  params: {
    userId: string;
    event: NotificationEvent;
    message: string;
    linkRoute?: UserNotificationLinkRoute | null;
    linkTargetId?: string | null;
    emailVars?: Record<string, string>;
    emailTemplateOverride?: EmailTemplateId;
  }
): Promise<void> {
  // Notifications are secondary effects: never let delivery failure roll back or
  // turn an already-confirmed booking, payment, order, or payout into an API error.
  let prefs: ProfilePrefs = {};
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", params.userId)
      .maybeSingle();
    if (error) {
      console.warn("[notificationDispatch] preferences lookup failed:", error.message);
    } else {
      prefs = parsePrefs((profile as { preferences?: unknown } | null)?.preferences);
    }
  } catch (err) {
    console.warn("[notificationDispatch] preferences lookup threw:", err);
  }

  const category = EVENT_CATEGORY[params.event];
  const allowed = categoryAllowed(prefs, category);

  if (allowed) {
    try {
      await insertUserNotification(supabase, {
        userId: params.userId,
        message: params.message,
        linkRoute: params.linkRoute ?? null,
        linkTargetId: params.linkTargetId ?? null,
      });
    } catch (err) {
      console.warn("[notificationDispatch] in-app notification failed:", err);
    }
  }

  const emailTemplate = params.emailTemplateOverride ?? EVENT_EMAIL[params.event];
  if (emailTemplate && allowed) {
    try {
      const result = await sendEmailToUserId(
        supabase,
        params.userId,
        emailTemplate,
        params.emailVars ?? {}
      );
      if (!result.ok) {
        console.warn("[notificationDispatch] email delivery failed:", result.error);
      }
    } catch (err) {
      console.warn("[notificationDispatch] email delivery threw:", err);
    }
  }

  if (!allowed || !process.env.EXPO_ACCESS_TOKEN) return;

  try {
    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", params.userId);
    if (error) {
      console.warn("[notificationDispatch] push token lookup failed:", error.message);
      return;
    }

    for (const row of (tokens ?? []) as { token: string }[]) {
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            to: row.token,
            title: "Nature's Grace",
            body: params.message,
            data: {
              linkRoute: params.linkRoute ?? null,
              linkTargetId: params.linkTargetId ?? null,
            },
          }),
        });
        if (!response.ok) {
          console.warn("[notificationDispatch] Expo push rejected:", response.status);
          continue;
        }
        const payload = await response.json().catch(() => null) as
          | { data?: { status?: string; message?: string } }
          | null;
        if (payload?.data?.status === "error") {
          console.warn("[notificationDispatch] Expo push error:", payload.data.message ?? "Unknown error");
        }
      } catch (err) {
        console.warn("[notificationDispatch] push delivery threw:", err);
      }
    }
  } catch (err) {
    console.warn("[notificationDispatch] push delivery failed:", err);
  }
}

export { sendTransactionalEmail };
