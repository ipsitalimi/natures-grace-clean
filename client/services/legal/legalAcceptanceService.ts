import { getSupabase } from "@/lib/supabase";
import type { ProfileRow } from "@/types/database";
import {
  DEFAULT_LEGAL_VERSIONS,
  USER_MANDATORY_LEGAL_KEYS,
  type LegalAcceptanceInput,
  type LegalDocumentKey,
  type LegalVersions,
  type ProfileLegalAcceptance,
  type UserMandatoryLegalKey,
} from "@/types/legal";

function readAcceptance(
  accepted: boolean | null | undefined,
  version: string | null | undefined,
  timestamp: string | null | undefined
) {
  return {
    accepted: Boolean(accepted),
    version: version ?? null,
    timestamp: timestamp ?? null,
  };
}

export function parseProfileLegalAcceptance(row: ProfileRow): ProfileLegalAcceptance {
  const r = row as ProfileRow & Record<string, unknown>;
  return {
    user_terms: readAcceptance(
      r.accepted_user_terms as boolean,
      r.accepted_user_terms_version as string,
      r.accepted_user_terms_timestamp as string
    ),
    privacy_policy: readAcceptance(
      r.accepted_privacy_policy as boolean,
      r.accepted_privacy_version as string,
      r.accepted_privacy_timestamp as string
    ),
    refund_policy: readAcceptance(
      r.accepted_refund_policy as boolean,
      r.accepted_refund_version as string,
      r.accepted_refund_timestamp as string
    ),
    medical_disclaimer: readAcceptance(
      r.accepted_medical_disclaimer as boolean,
      r.accepted_medical_version as string,
      r.accepted_medical_timestamp as string
    ),
    account_deletion_policy: readAcceptance(
      r.accepted_account_deletion_policy as boolean,
      r.accepted_account_deletion_version as string,
      r.accepted_account_deletion_timestamp as string
    ),
    grievance_policy: readAcceptance(
      r.accepted_grievance_policy as boolean,
      r.accepted_grievance_version as string,
      r.accepted_grievance_timestamp as string
    ),
    community_guidelines: readAcceptance(
      r.accepted_community_guidelines as boolean,
      r.accepted_community_guidelines_version as string,
      r.accepted_community_guidelines_timestamp as string
    ),
    shipping_policy: readAcceptance(
      r.accepted_shipping_policy as boolean,
      r.accepted_shipping_version as string,
      r.accepted_shipping_timestamp as string
    ),
    practitioner_agreement: readAcceptance(
      r.accepted_practitioner_agreement as boolean,
      r.accepted_practitioner_version as string,
      r.accepted_practitioner_timestamp as string
    ),
    seller_agreement: readAcceptance(
      r.accepted_seller_agreement as boolean,
      r.accepted_seller_version as string,
      r.accepted_seller_timestamp as string
    ),
  };
}

export function getPendingUserLegalKeys(
  acceptance: ProfileLegalAcceptance,
  versions: LegalVersions
): UserMandatoryLegalKey[] {
  return USER_MANDATORY_LEGAL_KEYS.filter((key) => {
    const record = acceptance[key];
    return !record.accepted || record.version !== versions[key];
  });
}

export function isPractitionerAgreementCurrent(
  acceptance: ProfileLegalAcceptance,
  versions: LegalVersions
): boolean {
  return (
    acceptance.practitioner_agreement.accepted &&
    acceptance.practitioner_agreement.version === versions.practitioner_agreement
  );
}

export function isSellerAgreementCurrent(
  acceptance: ProfileLegalAcceptance,
  versions: LegalVersions
): boolean {
  return (
    acceptance.seller_agreement.accepted &&
    acceptance.seller_agreement.version === versions.seller_agreement
  );
}

export async function fetchLegalVersions(): Promise<LegalVersions> {
  const supabase = getSupabase();
  if (!supabase) return { ...DEFAULT_LEGAL_VERSIONS };

  const { data, error } = await supabase.rpc("get_legal_versions");
  if (error || !data || typeof data !== "object") {
    console.error("[legalAcceptanceService] fetch versions:", error?.message);
    return { ...DEFAULT_LEGAL_VERSIONS };
  }

  return { ...DEFAULT_LEGAL_VERSIONS, ...(data as LegalVersions) };
}

export async function recordLegalAcceptances(
  acceptances: LegalAcceptanceInput[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data, error } = await supabase.rpc("record_legal_acceptances", {
    p_acceptances: acceptances,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    return { ok: false, error: result?.error ?? "Could not record legal acceptances" };
  }

  return { ok: true };
}

export function buildAcceptanceInputs(
  keys: LegalDocumentKey[],
  versions: LegalVersions
): LegalAcceptanceInput[] {
  return keys.map((key) => ({ key, version: versions[key] }));
}

export function formatLegalTimestamp(iso: string | null): string {
  if (!iso) return "Not accepted";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not accepted";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
