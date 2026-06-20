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

export async function getOrCreateWallet(
  commissionRate = 10,
  profileId?: string | null
): Promise<DbPractitionerWalletRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const practitionerId = await resolvePractitionerId(profileId);

  if (practitionerId) {
    const { data: existing } = await supabase
      .from("practitioner_wallets")
      .select("*")
      .eq("practitioner_id", practitionerId)
      .maybeSingle();
    if (existing) return existing as DbPractitionerWalletRow;
  }

  const { data, error } = await supabase
    .from("practitioner_wallets")
    .insert({
      practitioner_id: practitionerId,
      commission_rate: commissionRate,
      bank_account_label: null,
      next_payout_date: null,
    })
    .select()
    .single();

  if (error) {
    console.error("[practitionerEarnings] create wallet:", error.message);
    return null;
  }
  return data as DbPractitionerWalletRow;
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
    console.error("[practitionerEarnings] txns:", txnErr.message);
    return null;
  }

  const { data: payouts, error: payoutErr } = await supabase
    .from("practitioner_payouts")
    .select("*")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (payoutErr) {
    console.error("[practitionerEarnings] payouts:", payoutErr.message);
    return null;
  }

  const payoutRows = (payouts ?? []) as DbPayoutRow[];
  const activePayoutCount = payoutRows.filter(
    (p) => p.status === "Pending" || p.status === "Processing"
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
