import { getSupabase } from "@/lib/supabase";

export interface LegalAcceptanceEvent {
  id: string;
  documentKey: string;
  documentVersion: string;
  acceptedRole: string;
  acceptedAt: string;
}

export async function fetchLegalAcceptanceHistory(): Promise<LegalAcceptanceEvent[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("legal_acceptance_events")
    .select("*")
    .eq("user_id", user.id)
    .order("accepted_at", { ascending: false });

  if (error) {
    console.error("[legalAcceptanceHistory]", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, string>) => ({
    id: row.id,
    documentKey: row.document_key,
    documentVersion: row.document_version,
    acceptedRole: row.accepted_role,
    acceptedAt: row.accepted_at,
  }));
}
