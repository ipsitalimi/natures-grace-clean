import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DEFAULT_HOME_CONTENT, DEFAULT_PLATFORM_SETTINGS } from "@/constants/platformDefaults";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import {
  fetchPlatformConfig,
  savePlatformConfig,
  type PlatformConfigSnapshot,
} from "@/services/platformSettingsService";
import * as reviewsService from "@/services/content/reviewsService";
import * as notificationsService from "@/services/content/notificationsService";
import * as activityLogService from "@/services/platform/activityLogService";
import type { ActivityLogEntry, LogActivityOptions } from "@/data/activityLog";
import {
  fetchAllProfiles,
  profileToAdminUser,
  updateProfile as updateProfileRemote,
} from "@/services/profileService";
import type { ProfileRow } from "@/types/database";

import { type AdminUser } from "@/data/adminMockData";
import {
  type NotificationItem,
} from "@/data/mockNotifications";
import { StoreProduct } from "@/data/storeProducts";
import { Practitioner } from "@/data/practitioners";
import { CommunityEvent } from "@/context/DataContext";

export type ApprovalStatus = "Approved" | "Pending" | "Rejected";
export type UserRole = AdminUser["role"];
export type ReviewStatus = "Approved" | "Pending" | "Flagged";

export interface SessionInfo {
  email: string;
  role: UserRole | "Guest";
  displayName: string;
}

export interface PractitionerMeta {
  approvalStatus: ApprovalStatus;
  isVerified: boolean;
  featured: boolean;
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReport: boolean;
  maxAdvanceBookingDays: number;
  minBookingNoticeHours: number;
  instantBooking: boolean;
  allowRescheduling: boolean;
  freeCancellationHours: number;
  cancellationFeePercent: number;
  allowPartialRefunds: boolean;
  acceptUPI: boolean;
  acceptCards: boolean;
  acceptWallet: boolean;
  payoutCycle: "Weekly" | "Bi-Weekly" | "Monthly";
  commissionRate: number;
  minimumPrice: number;
  autoApproveProducts: boolean;
  featureFlags: {
    ngBuddy: boolean;
    journal: boolean;
    community: boolean;
    store: boolean;
    practitionerBooking: boolean;
  };
  appLabels: {
    storeTitle: string;
    communityTitle: string;
    journalTitle: string;
  };
  twoFactorEnabled: boolean;
  sessionTimeoutMinutes: number;
}

export interface HomeContent {
  affirmations: string[];
  breathingMessage: string;
  welcomeName: string;
  globalBanner: {
    enabled: boolean;
    message: string;
    tone: "info" | "warning";
  };
  actionCards: {
    exploreWellness: boolean;
    store: boolean;
    resources: boolean;
    journal: boolean;
    buddy: boolean;
    knowAdmin: boolean;
  };
  featuredPractitionerIds: string[];
  featuredProductIds: string[];
}

export interface ModeratedReview {
  id: string;
  userName: string;
  userInitial: string;
  practitionerName: string;
  rating: number;
  text: string;
  date: string;
  status: ReviewStatus;
}

export type { FlaggedItem } from "@/data/contentReports";

export type { ActivityLogEntry, LogActivityOptions } from "@/data/activityLog";

/** @deprecated Reviews load from Supabase via reviewsService in hydrateFromRemote. */
const SEED_REVIEWS: ModeratedReview[] = [];

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface PlatformConfigContextType {
  configLoading: boolean;
  isRemoteConfig: boolean;
  refreshRemoteConfig: (options?: { includeProfiles?: boolean }) => Promise<void>;
  session: SessionInfo;
  syncSessionFromProfile: (profile: ProfileRow) => void;
  clearSession: () => void;
  isAccountSuspended: (email: string) => boolean;
  isMaintenanceBlocking: boolean;

  users: AdminUser[];
  updateUser: (id: string, patch: Partial<AdminUser>) => Promise<{ error?: string }>;
  getUserByEmail: (email: string) => AdminUser | undefined;

  settings: PlatformSettings;
  updateSettings: (patch: Partial<PlatformSettings>) => void;
  persistConfigNow: () => Promise<{ error?: string }>;

  homeContent: HomeContent;
  updateHomeContent: (patch: Partial<HomeContent>) => void;
  getDailyAffirmation: () => string;

  productApprovals: Record<string, ApprovalStatus>;
  setProductApproval: (productId: string, status: ApprovalStatus) => void;
  isProductApproved: (productId: string) => boolean;
  filterApprovedProducts: <T extends { id: string }>(products: T[]) => T[];

  practitionerMeta: Record<string, PractitionerMeta>;
  setPractitionerMeta: (id: string, patch: Partial<PractitionerMeta>) => void;
  filterApprovedPractitioners: (practitioners: Practitioner[]) => Practitioner[];
  getFeaturedPractitioners: (practitioners: Practitioner[]) => Practitioner[];

  eventVisibility: Record<string, boolean>;
  setEventVisible: (eventId: string, visible: boolean) => void;
  filterVisibleEvents: (events: CommunityEvent[]) => CommunityEvent[];

  resourcePublished: Record<string, boolean>;
  setResourcePublished: (resourceId: string, published: boolean) => void;
  isResourcePublished: (resourceId: string) => boolean;

  reviews: ModeratedReview[];
  updateReviewStatus: (id: string, status: ReviewStatus) => void;
  approvedReviews: ModeratedReview[];

  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  addBroadcastNotification: (
    message: string,
    audience?: "All Users" | "Practitioners" | "Sellers"
  ) => Promise<void>;

  activityLog: ActivityLogEntry[];
  activityLogLoading: boolean;
  activityLogError: string | null;
  refreshActivityLog: () => Promise<void>;
  logActivity: (
    description: string,
    type: ActivityLogEntry["type"],
    options?: LogActivityOptions
  ) => void;
}

const PlatformConfigContext = createContext<PlatformConfigContextType | null>(null);

const GUEST_SESSION: SessionInfo = {
  email: "",
  role: "Guest",
  displayName: "Guest",
};

export function PlatformConfigProvider({ children }: { children: React.ReactNode }) {
  const {
    session: authSession,
    profile: authProfile,
    loading: authLoading,
    isConfigured: authConfigured,
  } = useAuth();
  const [configLoading, setConfigLoading] = useState(isSupabaseConfigured());
  const [isRemoteConfig, setIsRemoteConfig] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef<PlatformConfigSnapshot>({
    settings: DEFAULT_PLATFORM_SETTINGS,
    homeContent: DEFAULT_HOME_CONTENT,
    productApprovals: {},
    practitionerMeta: {},
    eventVisibility: {},
    resourcePublished: {},
  });

  const [session, setSession] = useState<SessionInfo>(GUEST_SESSION);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [homeContent, setHomeContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [productApprovals, setProductApprovals] = useState<Record<string, ApprovalStatus>>({});
  const [practitionerMeta, setPractitionerMetaState] = useState<Record<string, PractitionerMeta>>(
    {}
  );
  const [eventVisibility, setEventVisibility] = useState<Record<string, boolean>>({});
  const [resourcePublished, setResourcePublishedState] = useState<Record<string, boolean>>({});
  const [reviews, setReviews] = useState<ModeratedReview[]>(SEED_REVIEWS);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [activityLogLoading, setActivityLogLoading] = useState(isSupabaseConfigured());
  const [activityLogError, setActivityLogError] = useState<string | null>(null);

  const refreshActivityLog = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setActivityLog([]);
      setActivityLogLoading(false);
      setActivityLogError(null);
      return;
    }

    setActivityLogLoading(true);
    setActivityLogError(null);
    try {
      const rows = await activityLogService.fetchActivityLog(50);
      setActivityLog(rows);
    } catch (err) {
      setActivityLogError(
        err instanceof Error ? err.message : "Could not load activity log"
      );
      setActivityLog([]);
    } finally {
      setActivityLogLoading(false);
    }
  }, []);

  const logActivity = useCallback(
    (
      description: string,
      type: ActivityLogEntry["type"],
      options?: LogActivityOptions
    ) => {
      const optimisticId = generateId("act");
      const optimistic: ActivityLogEntry = {
        id: optimisticId,
        type,
        description,
        timeAgo: "Just now",
        actorName: options?.actorName,
        targetType: options?.targetType,
        targetId: options?.targetId,
      };

      setActivityLog((prev) => [optimistic, ...prev.filter((e) => e.id !== optimisticId)].slice(0, 49));

      if (!isSupabaseConfigured()) return;

      void activityLogService
        .insertActivityLog(type, description, options)
        .then((created) => {
          if (created) {
            setActivityLog((prev) => [
              created,
              ...prev.filter((e) => e.id !== optimisticId && e.id !== created.id),
            ].slice(0, 50));
          }
        })
        .catch((err) => {
          console.error("[PlatformConfig] activity log:", err);
        });
    },
    []
  );

  const buildSnapshot = useCallback(
    (
      nextSettings: PlatformSettings,
      nextHome: HomeContent,
      nextApprovals: Record<string, ApprovalStatus>,
      nextPractitionerMeta: Record<string, PractitionerMeta>,
      nextEventVisibility: Record<string, boolean>,
      nextResourcePublished: Record<string, boolean>
    ): PlatformConfigSnapshot => ({
      settings: nextSettings,
      homeContent: nextHome,
      productApprovals: nextApprovals,
      practitionerMeta: nextPractitionerMeta,
      eventVisibility: nextEventVisibility,
      resourcePublished: nextResourcePublished,
    }),
    []
  );

  const schedulePersist = useCallback((snapshot?: PlatformConfigSnapshot) => {
    if (!isSupabaseConfigured()) return;
    const payload = snapshot ?? configRef.current;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void savePlatformConfig(payload).then(({ error }) => {
        if (error) console.warn("[PlatformConfig] persist failed:", error);
      });
    }, 400);
  }, []);

  const persistConfigNow = useCallback(async (): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured()) return { error: "Supabase not configured" };
    if (persistTimer.current) {
      clearTimeout(persistTimer.current);
      persistTimer.current = null;
    }
    return savePlatformConfig(configRef.current);
  }, []);

  useEffect(() => {
    configRef.current = buildSnapshot(
      settings,
      homeContent,
      productApprovals,
      practitionerMeta,
      eventVisibility,
      resourcePublished
    );
  }, [
    settings,
    homeContent,
    productApprovals,
    practitionerMeta,
    eventVisibility,
    resourcePublished,
    buildSnapshot,
  ]);

  const hydrateFromRemote = useCallback(async (options?: { includeProfiles?: boolean }) => {
    const includeProfiles = options?.includeProfiles ?? false;
    const [remote, remoteReviews, remoteNotifications] = await Promise.all([
      fetchPlatformConfig(),
      reviewsService.fetchReviews(),
      notificationsService.fetchNotifications(),
    ]);
    if (remote) {
      setSettings(remote.settings);
      setHomeContent(remote.homeContent);
      setProductApprovals({});
      setPractitionerMetaState({});
      setEventVisibility(remote.eventVisibility);
      setResourcePublishedState(remote.resourcePublished);
      setIsRemoteConfig(true);
    }
    setReviews(remoteReviews);
    setNotifications(remoteNotifications);
    await refreshActivityLog();
    if (isSupabaseConfigured()) {
      const profiles = await fetchAllProfiles();
      setUsers(profiles.map(profileToAdminUser));
    } else if (includeProfiles) {
      const profiles = await fetchAllProfiles();
      if (profiles.length > 0) {
        setUsers(profiles.map(profileToAdminUser));
      }
    }
  }, [refreshActivityLog]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setConfigLoading(false);
      return;
    }
    if (authConfigured && authLoading) return;

    let cancelled = false;

    (async () => {
      await hydrateFromRemote({ includeProfiles: authProfile?.role === "Admin" });
      if (!cancelled) setConfigLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrateFromRemote, authConfigured, authLoading, authSession?.user?.id, authProfile?.role]);

  const syncSessionFromProfile = useCallback((profile: ProfileRow) => {
    setSession({
      email: profile.email.toLowerCase(),
      role: profile.role as UserRole,
      displayName: profile.full_name?.split(" ")[0] || profile.email.split("@")[0],
    });
    logActivity(`${profile.full_name || profile.email} signed in as ${profile.role}`, "user");
  }, [logActivity]);

  const clearSession = useCallback(() => {
    setSession(GUEST_SESSION);
  }, []);

  const isAccountSuspended = useCallback(
    (email: string) => {
      const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      return user?.status === "Suspended";
    },
    [users]
  );

  const isMaintenanceBlocking = useMemo(
    () => settings.maintenanceMode && session.role !== "Admin",
    [settings.maintenanceMode, session.role]
  );

  const updateUser = useCallback(
    async (id: string, patch: Partial<AdminUser>) => {
      const previous = users.find((u) => u.id === id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      if (isSupabaseConfigured()) {
        const result = await updateProfileRemote(id, {
          full_name: patch.name,
          role: patch.role,
          status: patch.status,
          phone: patch.phone,
        });
        if (result.error && previous) {
          setUsers((prev) => prev.map((u) => (u.id === id ? previous : u)));
          return { error: result.error };
        }
      }
      logActivity(`User ${id} updated`, "user", {
        targetType: "profile",
        targetId: id,
        afterSnapshot: patch as Record<string, unknown>,
      });
      return {};
    },
    [users, logActivity]
  );

  const getUserByEmail = useCallback(
    (email: string) => users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()),
    [users]
  );

  const updateSettings = useCallback(
    (patch: Partial<PlatformSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        schedulePersist(
          buildSnapshot(
            next,
            homeContent,
            productApprovals,
            practitionerMeta,
            eventVisibility,
            resourcePublished
          )
        );
        return next;
      });
      logActivity("Platform settings updated", "settings");
    },
    [
      buildSnapshot,
      schedulePersist,
      homeContent,
      productApprovals,
      practitionerMeta,
      eventVisibility,
      resourcePublished,
      logActivity,
    ]
  );

  const updateHomeContent = useCallback(
    (patch: Partial<HomeContent>) => {
      setHomeContent((prev) => {
        const next = { ...prev, ...patch };
        schedulePersist(
          buildSnapshot(
            settings,
            next,
            productApprovals,
            practitionerMeta,
            eventVisibility,
            resourcePublished
          )
        );
        return next;
      });
    },
    [
      buildSnapshot,
      schedulePersist,
      settings,
      productApprovals,
      practitionerMeta,
      eventVisibility,
      resourcePublished,
    ]
  );

  const getDailyAffirmation = useCallback(() => {
    const today = new Date();
    const dayIndex =
      today.getFullYear() * 1000 + today.getMonth() * 31 + today.getDate();
    const list = homeContent.affirmations;
    if (list.length === 0) return "";
    return list[dayIndex % list.length];
  }, [homeContent.affirmations]);

  const setProductApproval = useCallback(
    (productId: string, status: ApprovalStatus) => {
      setProductApprovals((prev) => ({ ...prev, [productId]: status }));
      schedulePersist();
      logActivity(`Product ${productId} set to ${status}`, "store");
    },
    [logActivity, schedulePersist]
  );

  const isProductApproved = useCallback(
    (productId: string) => {
      const status = productApprovals[productId];
      if (!status) return true;
      return status === "Approved";
    },
    [productApprovals]
  );

  const filterApprovedProducts = useCallback(
    <T extends { id: string }>(products: T[]) =>
      products.filter((p) => isProductApproved(p.id)),
    [isProductApproved]
  );

  const setPractitionerMeta = useCallback(
    (id: string, patch: Partial<PractitionerMeta>) => {
      setPractitionerMetaState((prev) => ({
        ...prev,
        [id]: {
          approvalStatus: prev[id]?.approvalStatus ?? "Approved",
          isVerified: prev[id]?.isVerified ?? false,
          featured: prev[id]?.featured ?? false,
          ...patch,
        },
      }));
      schedulePersist();
    },
    [schedulePersist]
  );

  const filterApprovedPractitioners = useCallback(
    (practitioners: Practitioner[]) =>
      practitioners.filter((p) => (p.approvalStatus ?? "Approved") === "Approved"),
    []
  );

  const getFeaturedPractitioners = useCallback(
    (practitioners: Practitioner[]) => {
      const ids = homeContent.featuredPractitionerIds;
      if (ids.length === 0) return practitioners.slice(0, 4);
      const featured = ids
        .map((id) => practitioners.find((p) => p.id === id))
        .filter(Boolean) as Practitioner[];
      return featured.length > 0 ? featured : practitioners.slice(0, 4);
    },
    [homeContent.featuredPractitionerIds]
  );

  const setEventVisible = useCallback(
    (eventId: string, visible: boolean) => {
      setEventVisibility((prev) => ({ ...prev, [eventId]: visible }));
      schedulePersist();
    },
    [schedulePersist]
  );

  const filterVisibleEvents = useCallback(
    (events: CommunityEvent[]) =>
      events.filter((e) => {
        const visible = eventVisibility[e.id];
        return visible !== false;
      }),
    [eventVisibility]
  );

  const setResourcePublished = useCallback(
    (resourceId: string, published: boolean) => {
      setResourcePublishedState((prev) => ({ ...prev, [resourceId]: published }));
      schedulePersist();
    },
    [schedulePersist]
  );

  const isResourcePublished = useCallback(
    (resourceId: string) => resourcePublished[resourceId] !== false,
    [resourcePublished]
  );

  const updateReviewStatus = useCallback(
    async (id: string, status: ReviewStatus) => {
      if (isSupabaseConfigured()) {
        await reviewsService.updateReviewStatus(id, status);
      }
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      logActivity(`Review ${id} marked ${status}`, "review", {
        targetType: "review",
        targetId: id,
        afterSnapshot: { status },
      });
    },
    [logActivity]
  );

  const approvedReviews = useMemo(
    () => reviews.filter((r) => r.status === "Approved"),
    [reviews]
  );

  const addBroadcastNotification = useCallback(
    async (message: string, audience: "All Users" | "Practitioners" | "Sellers" = "All Users") => {
      if (isSupabaseConfigured()) {
        const created = await notificationsService.insertNotificationForAudience(message, audience);
        if (created.length > 0) {
          setNotifications((prev) => [...created, ...prev]);
          return;
        }
        throw new Error("No notifications were created. Check audience and permissions.");
      }
      setNotifications((prev) => [
        {
          id: generateId("notif"),
          message,
          time: "Just now",
          unread: true,
        },
        ...prev,
      ]);
    },
    []
  );

  const value: PlatformConfigContextType = {
    configLoading,
    isRemoteConfig,
    refreshRemoteConfig: hydrateFromRemote,
    session,
    syncSessionFromProfile,
    clearSession,
    isAccountSuspended,
    isMaintenanceBlocking,
    users,
    updateUser,
    getUserByEmail,
    settings,
    updateSettings,
    persistConfigNow,
    homeContent,
    updateHomeContent,
    getDailyAffirmation,
    productApprovals,
    setProductApproval,
    isProductApproved,
    filterApprovedProducts,
    practitionerMeta,
    setPractitionerMeta,
    filterApprovedPractitioners,
    getFeaturedPractitioners,
    eventVisibility,
    setEventVisible,
    filterVisibleEvents,
    resourcePublished,
    setResourcePublished,
    isResourcePublished,
    reviews,
    updateReviewStatus,
    approvedReviews,
    notifications,
    setNotifications,
    addBroadcastNotification,
    activityLog,
    activityLogLoading,
    activityLogError,
    refreshActivityLog,
    logActivity,
  };

  return (
    <PlatformConfigContext.Provider value={value}>
      {children}
    </PlatformConfigContext.Provider>
  );
}

export function usePlatformConfig(): PlatformConfigContextType {
  const ctx = useContext(PlatformConfigContext);
  if (!ctx) {
    throw new Error("usePlatformConfig must be used inside PlatformConfigProvider");
  }
  return ctx;
}
