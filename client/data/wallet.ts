/** Seller wallet types (ledger + payouts; RazorpayX disbursement is a later step). */

export type WalletTransactionType = "credit" | "debit";

export type WalletTransactionCategory =
  | "order_earning"
  | "earning_release"
  | "payout"
  | "refund"
  | "adjustment";

export type PayoutStatus =
  | "Pending"
  | "Under Review"
  | "Processing"
  | "Completed"
  | "Rejected"
  | "Failed"
  | "Cancelled";

export interface WalletTransaction {
  id: string;
  description: string;
  amount: number;
  type: WalletTransactionType;
  date: string;
  orderId?: string;
  payoutId?: string;
  category?: WalletTransactionCategory;
}

export interface SellerWalletSnapshot {
  walletId: string;
  availableBalance: number;
  pendingPayout: number;
  heldBalance: number;
  totalEarned: number;
  commissionRate: number;
  bankAccountLabel: string;
  nextPayoutDate: string;
  transactions: WalletTransaction[];
  payouts: SellerPayout[];
  /** Pending + Processing payout count */
  activePayoutCount: number;
}

export interface SellerPayout {
  id: string;
  amount: number;
  status: PayoutStatus;
  createdAt: string;
  razorpayPayoutId?: string;
  razorpayFundAccountId?: string;
  failureReason?: string;
}
