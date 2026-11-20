import type {
  PayoutStatus,
  PractitionerWalletSnapshot,
  PractitionerWalletTransaction,
} from "@/data/practitionerBookings";
import { getSupabase } from "@/lib/supabase";
import { resolvePractitionerId } from "@/services/content/practitionerId";
import { isPractitionerBankAccountLinked } from "@/lib/payoutDisclosure";

export type DbPractitionerWalletRow = {
  id: string;
  practitioner_id: string | null;
  available_balance: number;
  pending_payout: number;
  held_balance: number;
  total_earned: number;
  commission_rate: number;
  bank_account_label: string | null;
  bank_account_holder: string | null;
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

type MonthlyWalletTxnRow = {
  amount: number;
  type: "credit" | "debit";
  created_at: string;
};

async function fetchMonthlyWalletEarnings(
  walletId: string
): Promise<{ currentMonth: number; previousMonth: number }> {
  const supabase = getSupabase();
  if (!supabase) return { currentMonth: 0, previousMonth: 0 };

  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const rows: MonthlyWalletTxnRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("practitioner_wallet_transactions")
      .select("amount, type, created_at")
      .eq("wallet_id", walletId)
      .in("category", ["booking_earning", "refund", "adjustment"])
      .gte("created_at", previousStart.toISOString())
      .lt("created_at", nextStart.toISOString())
      .order("created_at", { ascending: true })
      .range(offset, offset + 999);

    if (error) {
      console.warn("[practitionerEarnings] monthly ledger:", error.message);
      return { currentMonth: 0, previousMonth: 0 };
    }

    const page = (data ?? []) as MonthlyWalletTxnRow[];
    rows.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }

  let currentMonth = 0;
  let previousMonth = 0;
  for (const row of rows) {
    const createdAt = new Date(row.created_at);
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;
    const signedAmount = row.type === "debit" ? -amount : amount;
    if (createdAt >= currentStart && createdAt < nextStart) {
      currentMonth += signedAmount;
    } else if (createdAt >= previousStart && createdAt < currentStart) {
      previousMonth += signedAmount;
    }
  }

  return {
    currentMonth: Math.round(currentMonth * 100) / 100,
    previousMonth: Math.round(previousMonth * 100) / 100,
  };
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
  _commissionRate = 10,
  profileId?: string | null
): Promise<DbPractitionerWalletRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const practitionerId = await resolvePractitionerId(profileId);
  if (!practitionerId) {
    console.warn("[practitionerEarnings] wallet skipped: practitioner profile not found");
    return null;
  }

  // Wallet creation and commission assignment are backend/admin-only. The
  // practitioner client is deliberately read-only and never invokes a wallet RPC.
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
    .neq("category", "earning_release")
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

  const monthlyEarnings = await fetchMonthlyWalletEarnings(wallet.id);
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
    bankAccountLabel: isPractitionerBankAccountLinked(
      wallet.bank_account_label,
      wallet.bank_account_holder
    )
      ? wallet.bank_account_label!.trim()
      : "Bank account not linked",
    bankAccountHolder: wallet.bank_account_holder?.trim() || "",
    monthlyEarnings: monthlyEarnings.currentMonth,
    previousMonthEarnings: monthlyEarnings.previousMonth,
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
