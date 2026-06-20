import { getSupabase } from "@/lib/supabase";
import { resolveSellerIdByProfileId } from "@/services/commerce/sellerId";
import type {
  PayoutStatus,
  SellerPayout,
  SellerWalletSnapshot,
  WalletTransaction,
} from "@/data/wallet";

export type DbSellerWalletRow = {
  id: string;
  seller_id: string | null;
  available_balance: number;
  pending_payout: number;
  held_balance: number;
  total_earned: number;
  commission_rate: number;
  bank_account_label: string | null;
  next_payout_date: string | null;
};

export type DbWalletTransactionRow = {
  id: string;
  wallet_id: string;
  order_id: string | null;
  payout_id: string | null;
  type: "credit" | "debit";
  category: string;
  amount: number;
  description: string;
  is_released: boolean;
  created_at: string;
};

function formatTxnDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function getOrCreateWallet(commissionRate = 10): Promise<DbSellerWalletRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sellerId = await resolveSellerIdByProfileId(user.id);
  if (!sellerId) return null;

  const { data: existing } = await supabase
    .from("seller_wallets")
    .select("*")
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (existing) return existing as DbSellerWalletRow;

  const { data, error } = await supabase
    .from("seller_wallets")
    .insert({
      seller_id: sellerId,
      commission_rate: commissionRate,
      bank_account_label: null,
      next_payout_date: null,
    })
    .select()
    .single();

  if (error) {
    console.error("[walletService] create wallet:", error.message);
    return null;
  }
  return data as DbSellerWalletRow;
}

export type DbSellerPayoutRow = {
  id: string;
  wallet_id: string;
  amount: number;
  status: PayoutStatus;
  razorpay_payout_id: string | null;
  razorpay_fund_account_id: string | null;
  failure_reason: string | null;
  created_at: string;
};

function mapPayout(row: DbSellerPayoutRow): SellerPayout {
  return {
    id: row.id,
    amount: Number(row.amount),
    status: row.status,
    createdAt: formatTxnDate(row.created_at),
    razorpayPayoutId: row.razorpay_payout_id ?? undefined,
    razorpayFundAccountId: row.razorpay_fund_account_id ?? undefined,
    failureReason: row.failure_reason ?? undefined,
  };
}

function mapTransaction(row: DbWalletTransactionRow): WalletTransaction {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    type: row.type,
    date: formatTxnDate(row.created_at),
    orderId: row.order_id ?? undefined,
    payoutId: row.payout_id ?? undefined,
    category: row.category as WalletTransaction["category"],
  };
}

export async function fetchWalletSnapshot(commissionRate = 10): Promise<SellerWalletSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const wallet = await getOrCreateWallet(commissionRate);
  if (!wallet) return null;

  const { data: txns, error: txnError } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (txnError) {
    console.error("[walletService] fetch txns:", txnError.message);
    return null;
  }

  const { data: payouts, error: payoutError } = await supabase
    .from("seller_payouts")
    .select("*")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (payoutError) {
    console.error("[walletService] fetch payouts:", payoutError.message);
    return null;
  }

  const payoutRows = (payouts ?? []) as DbSellerPayoutRow[];
  const activePayoutCount = payoutRows.filter((p) =>
    p.status === "Pending" || p.status === "Processing"
  ).length;

  return {
    walletId: wallet.id,
    availableBalance: Number(wallet.available_balance),
    pendingPayout: Number(wallet.pending_payout),
    heldBalance: Number(wallet.held_balance),
    totalEarned: Number(wallet.total_earned),
    commissionRate: Number(wallet.commission_rate),
    bankAccountLabel: wallet.bank_account_label?.trim() || "Bank account not linked",
    nextPayoutDate: wallet.next_payout_date?.trim() || "Scheduled after admin review",
    transactions: ((txns ?? []) as DbWalletTransactionRow[]).map(mapTransaction),
    payouts: payoutRows.map(mapPayout),
    activePayoutCount,
  };
}

export async function countWalletTransactions(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("wallet_transactions")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}
