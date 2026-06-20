import { getApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";

export type PayoutQueueItem = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  rejection_reason?: string | null;
  seller_wallets?: {
    seller_id?: string;
    sellers?: { store_name?: string; profile_id?: string };
  };
  practitioner_wallets?: {
    practitioner_id?: string;
    practitioners?: { name?: string; profile_id?: string };
  };
};

export type RefundQueueItem = {
  id: string;
  user_id: string;
  order_id: string | null;
  booking_id: string | null;
  reason: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

export async function fetchAdminPayoutQueue(accessToken: string): Promise<{
  seller: PayoutQueueItem[];
  practitioner: PayoutQueueItem[];
  error?: string;
}> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/admin/payouts`, {
      headers: authJsonHeaders(accessToken),
    });
    const json = (await res.json()) as {
      seller?: PayoutQueueItem[];
      practitioner?: PayoutQueueItem[];
      error?: string;
    };
    if (!res.ok) return { seller: [], practitioner: [], error: json.error ?? "Failed to load payouts" };
    return { seller: json.seller ?? [], practitioner: json.practitioner ?? [] };
  } catch (err) {
    return {
      seller: [],
      practitioner: [],
      error: err instanceof Error ? err.message : "Could not load payouts",
    };
  }
}

export async function updatePayoutStatus(
  accessToken: string,
  type: "seller" | "practitioner",
  payoutId: string,
  status: string,
  rejectionReason?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/admin/payouts/${type}/${payoutId}/status`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify({ status, rejectionReason }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) return { ok: false, error: json.error ?? "Update failed" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}

export async function fetchAdminRefunds(accessToken: string): Promise<{
  refunds: RefundQueueItem[];
  error?: string;
}> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/admin/refunds`, {
      headers: authJsonHeaders(accessToken),
    });
    const json = (await res.json()) as { refunds?: RefundQueueItem[]; error?: string };
    if (!res.ok) return { refunds: [], error: json.error ?? "Failed to load refunds" };
    return { refunds: json.refunds ?? [] };
  } catch (err) {
    return { refunds: [], error: err instanceof Error ? err.message : "Could not load refunds" };
  }
}

export async function updateRefundStatus(
  accessToken: string,
  refundId: string,
  status: "in_review" | "approved" | "rejected",
  adminNotes?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/admin/refunds/${refundId}/status`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify({ status, adminNotes }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) return { ok: false, error: json.error ?? "Update failed" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}
