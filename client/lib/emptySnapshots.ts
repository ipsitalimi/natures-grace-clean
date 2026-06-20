import type { SellerWalletSnapshot } from "@/data/wallet";
import type { PractitionerWalletSnapshot } from "@/data/practitionerBookings";

/** Zeroed wallet shape when Supabase is not loaded yet (no mock balances). */
export function emptySellerWalletSnapshot(commissionRate = 10): SellerWalletSnapshot {
  return {
    walletId: "local",
    availableBalance: 0,
    pendingPayout: 0,
    heldBalance: 0,
    totalEarned: 0,
    commissionRate,
    bankAccountLabel: "",
    nextPayoutDate: "",
    transactions: [],
    payouts: [],
    activePayoutCount: 0,
  };
}

export function emptyPractitionerWalletSnapshot(commissionRate = 10): PractitionerWalletSnapshot {
  return {
    walletId: "local",
    availableBalance: 0,
    pendingPayout: 0,
    heldBalance: 0,
    totalEarned: 0,
    commissionRate,
    bankAccountLabel: "",
    nextPayoutDate: "",
    transactions: [],
    payouts: [],
    activePayoutCount: 0,
  };
}
