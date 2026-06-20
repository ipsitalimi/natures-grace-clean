export interface ProfilePreferences {
  notificationsEnabled: boolean;
  bookingReminders: boolean;
  orderUpdates: boolean;
  communityActivity: boolean;
  promotions: boolean;
  platformAnnouncements: boolean;
}

export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  notificationsEnabled: true,
  bookingReminders: true,
  orderUpdates: true,
  communityActivity: true,
  promotions: true,
  platformAnnouncements: true,
};

export function parseProfilePreferences(raw: unknown): ProfilePreferences {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PROFILE_PREFERENCES };
  }
  const obj = raw as Record<string, unknown>;
  const base = { ...DEFAULT_PROFILE_PREFERENCES };
  if (typeof obj.notificationsEnabled === "boolean") {
    base.notificationsEnabled = obj.notificationsEnabled;
  }
  if (typeof obj.bookingReminders === "boolean") base.bookingReminders = obj.bookingReminders;
  if (typeof obj.orderUpdates === "boolean") base.orderUpdates = obj.orderUpdates;
  if (typeof obj.communityActivity === "boolean") base.communityActivity = obj.communityActivity;
  if (typeof obj.promotions === "boolean") base.promotions = obj.promotions;
  if (typeof obj.platformAnnouncements === "boolean") {
    base.platformAnnouncements = obj.platformAnnouncements;
  }
  return base;
}
