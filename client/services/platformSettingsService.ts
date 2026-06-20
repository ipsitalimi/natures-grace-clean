import { getSupabase } from "@/lib/supabase";
import { DEFAULT_HOME_CONTENT, DEFAULT_PLATFORM_SETTINGS } from "@/constants/platformDefaults";
import type {
  HomeContent,
  PlatformSettings,
  ApprovalStatus,
  PractitionerMeta,
} from "@/context/PlatformConfigContext";
import type { PlatformSettingsRow } from "@/types/database";

export interface PlatformConfigSnapshot {
  settings: PlatformSettings;
  homeContent: HomeContent;
  productApprovals: Record<string, ApprovalStatus>;
  practitionerMeta: Record<string, PractitionerMeta>;
  eventVisibility: Record<string, boolean>;
  resourcePublished: Record<string, boolean>;
}

function mergeSettings(raw: Record<string, unknown> | null | undefined): PlatformSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PLATFORM_SETTINGS };
  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...(raw as Partial<PlatformSettings>),
    featureFlags: {
      ...DEFAULT_PLATFORM_SETTINGS.featureFlags,
      ...((raw.featureFlags as PlatformSettings["featureFlags"]) ?? {}),
    },
    appLabels: {
      ...DEFAULT_PLATFORM_SETTINGS.appLabels,
      ...((raw.appLabels as PlatformSettings["appLabels"]) ?? {}),
    },
  };
}

function mergeHomeContent(raw: Record<string, unknown> | null | undefined): HomeContent {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_HOME_CONTENT };
  return {
    ...DEFAULT_HOME_CONTENT,
    ...(raw as Partial<HomeContent>),
    globalBanner: {
      ...DEFAULT_HOME_CONTENT.globalBanner,
      ...((raw.globalBanner as HomeContent["globalBanner"]) ?? {}),
    },
    actionCards: {
      ...DEFAULT_HOME_CONTENT.actionCards,
      ...((raw.actionCards as HomeContent["actionCards"]) ?? {}),
    },
    affirmations: Array.isArray(raw.affirmations)
      ? (raw.affirmations as string[])
      : DEFAULT_HOME_CONTENT.affirmations,
    featuredPractitionerIds: Array.isArray(raw.featuredPractitionerIds)
      ? (raw.featuredPractitionerIds as string[])
      : DEFAULT_HOME_CONTENT.featuredPractitionerIds,
    featuredProductIds: Array.isArray(raw.featuredProductIds)
      ? (raw.featuredProductIds as string[])
      : DEFAULT_HOME_CONTENT.featuredProductIds,
  };
}

export function rowToSnapshot(row: PlatformSettingsRow): PlatformConfigSnapshot {
  return {
    settings: mergeSettings(row.settings),
    homeContent: mergeHomeContent(row.home_content),
    productApprovals: row.product_approvals ?? {},
    practitionerMeta: (row.practitioner_meta ?? {}) as Record<string, PractitionerMeta>,
    eventVisibility: row.event_visibility ?? {},
    resourcePublished: row.resource_published ?? {},
  };
}

export async function fetchPlatformConfig(): Promise<PlatformConfigSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    console.error("[platformSettingsService] fetch:", error.message);
    return null;
  }
  if (!data) return null;
  return rowToSnapshot(data as PlatformSettingsRow);
}

export async function savePlatformConfig(snapshot: PlatformConfigSnapshot): Promise<{ error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  const payload = {
    id: "default",
    settings: snapshot.settings,
    home_content: snapshot.homeContent,
    event_visibility: snapshot.eventVisibility,
    resource_published: snapshot.resourcePublished,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("platform_settings").upsert(payload);

  if (error) return { error: error.message };
  return {};
}
