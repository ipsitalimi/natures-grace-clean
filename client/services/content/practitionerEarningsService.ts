import type {
  PayoutStatus,
  PractitionerWalletSnapshot,
  PractitionerWalletTransaction,
} from "@/data/practitionerBookings";
import { getSupabase } from "@/lib/supabase";
import { resolvePractitionerId } from "@/services/content/practitionerId";

export type DbPractitionerWalletRow = {
  id: string;
  practitioner_id: string | null;
  available_balance: number;
  pending_payout: number;
  held_balance: number;
  total_earned: number;
  commission_rate: number;
  bank_account_label: string | null;
  next_payout_date: string | null;
};

type DbWalletTxnRow = {
  id: string;
  wallet_id: string;
  booking_id: string | null;
  payout_id: string | null;
  type: "credit" | "debit";
  category: string;
  amount: number;
  description: string;
  is_released: boolean;
  created_at: string;
};

type DbPayoutRow = {
  id: string;
  amount: number;
  status: PayoutStatus;
  razorpay_payout_id: string | null;
  failure_reason: string | null;
  created_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function fetchWalletByPractitionerId(
  practitionerId: string
): Promise<DbPractitionerWalletRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("practitioner_wallets")
    .select("*")
    .eq("practitioner_id", practitionerId)
    .maybeSingle();

  if (error) {
    console.warn("[practitionerEarnings] fetch wallet:", error.message);
    return null;
  }

  return (data as DbPractitionerWalletRow | null) ?? null;
}

export async function getOrCreateWallet(
  commissionRate = 10,
  profileId?: string | null
): Promise<DbPractitionerWalletRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const practitionerId = await resolvePractitionerId(profileId);
  if (!practitionerId) {
    console.warn("[practitionerEarnings] wallet skipped: no active practitioner row");
    return null;
  }

  const existing = await fetchWalletByPractitionerId(practitionerId);
  if (existing) return existing;

  const { data, error } = await supabase.rpc("ensure_practitioner_wallet", {
    p_commission_rate: commissionRate,
  });

  if (!error && data) {
    return data as DbPractitionerWalletRow;
  }

  if (error) {
    console.warn("[practitionerEarnings] ensure wallet:", error.message);
  }

  // Race or migration not applied yet — retry read-only path.
  return fetchWalletByPractitionerId(practitionerId);
}

export async function fetchWalletSnapshot(
  commissionRate = 10,
  profileId?: string | null
): Promise<PractitionerWalletSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const wallet = await getOrCreateWallet(commissionRate, profileId);
  if (!wallet) return null;

  const { data: txns, error: txnErr } = await supabase
    .from("practitioner_wallet_transactions")
    .select("*")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (txnErr) {
    console.warn("[practitionerEarnings] txns:", txnErr.message);
    return null;
  }

  const { data: payouts, error: payoutErr } = await supabase
    .from("practitioner_payouts")
    .select("*")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (payoutErr) {
    console.warn("[practitionerEarnings] payouts:", payoutErr.message);
    return null;
  }

  const payoutRows = (payouts ?? []) as DbPayoutRow[];
  const activePayoutCount = payoutRows.filter(
    (p) => p.status === "Pending" || p.status === "Processing" || p.status === "Under Review"
  ).length;

  const transactions: PractitionerWalletTransaction[] = (
    (txns ?? []) as DbWalletTxnRow[]
  ).map((row) => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    type: row.type,
    date: formatDate(row.created_at),
    bookingId: row.booking_id ?? undefined,
    payoutId: row.payout_id ?? undefined,
    category: row.category as PractitionerWalletTransaction["category"],
  }));

  return {
    walletId: wallet.id,
    availableBalance: Number(wallet.available_balance),
    pendingPayout: Number(wallet.pending_payout),
    heldBalance: Number(wallet.held_balance),
    totalEarned: Number(wallet.total_earned),
    commissionRate: Number(wallet.commission_rate),
    bankAccountLabel: wallet.bank_account_label?.trim() || "Bank account not linked",
    nextPayoutDate: wallet.next_payout_date?.trim() || "Scheduled after admin review",
    transactions,
    payouts: payoutRows.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      createdAt: formatDate(p.created_at),
      razorpayPayoutId: p.razorpay_payout_id ?? undefined,
      failureReason: p.failure_reason ?? undefined,
    })),
    activePayoutCount,
  };
}
