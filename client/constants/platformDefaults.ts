import type { HomeContent, PlatformSettings } from "@/context/PlatformConfigContext";

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  maintenanceMode: false,
  emailNotifications: true,
  pushNotifications: true,
  weeklyReport: false,
  maxAdvanceBookingDays: 30,
  minBookingNoticeHours: 2,
  instantBooking: true,
  allowRescheduling: true,
  freeCancellationHours: 24,
  cancellationFeePercent: 100,
  allowPartialRefunds: true,
  acceptUPI: true,
  acceptCards: true,
  acceptWallet: false,
  payoutCycle: "Weekly",
  commissionRate: 12,
  minimumPrice: 99,
  autoApproveProducts: __DEV__,
  featureFlags: {
    ngBuddy: false,
    journal: true,
    community: true,
    store: true,
    practitionerBooking: true,
  },
  appLabels: {
    storeTitle: "Nature's Grace Store",
    communityTitle: "Community",
    journalTitle: "Reflect & Journal",
  },
  twoFactorEnabled: false,
  sessionTimeoutMinutes: 30,
  youtubeChannelUrl: "",
};

export const DEFAULT_HOME_CONTENT: HomeContent = {
  affirmations: [],
  breathingMessage: "Take a deep breath. You are here now.",
  welcomeName: "",
  globalBanner: {
    enabled: false,
    message: "",
    tone: "info",
  },
  actionCards: {
    exploreWellness: true,
    store: true,
    resources: true,
    journal: true,
    buddy: true,
    knowAdmin: true,
  },
  featuredPractitionerIds: [],
  featuredProductIds: [],
};
