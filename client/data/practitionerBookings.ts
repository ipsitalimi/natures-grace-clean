/** Practitioner bookings, offerings, wallet (service-based lifecycle). */

export type SessionOffering = {
  id: string;
  sessionType: string;
  duration: number;
  price: number;
  notes: string;
};

export type PractitionerSessionStatus = "Upcoming" | "Completed" | "Cancelled";

export interface PractitionerSession {
  id: string;
  userName: string;
  service: string;
  date: string;
  time: string;
  duration: string;
  status: PractitionerSessionStatus;
  notes?: string;
  amount?: number;
  paymentStatus?: "Pending" | "Paid" | "Refunded";
  meetingLink?: string;
}

export type BookingStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";
export type BookingPaymentStatus = "Pending" | "Paid" | "Refunded";

export type DbBookingRow = {
  id: string;
  booking_number: string;
  practitioner_id: string | null;
  offering_id: string | null;
  user_id: string | null;
  client_name: string;
  client_email: string | null;
  service_name: string;
  session_date: string;
  session_time: string;
  duration_minutes: number;
  amount: number;
  booking_status: BookingStatus;
  payment_status: BookingPaymentStatus;
  razorpay_payment_id: string | null;
  notes: string | null;
  meeting_link: string | null;
  created_at: string;
  completed_at: string | null;
};

export type PayoutStatus = "Pending" | "Processing" | "Completed" | "Failed" | "Cancelled";

export type PractitionerWalletTransaction = {
  id: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  date: string;
  bookingId?: string;
  payoutId?: string;
  category?: "booking_earning" | "earning_release" | "payout" | "refund" | "adjustment";
};

export type PractitionerPayout = {
  id: string;
  amount: number;
  status: PayoutStatus;
  createdAt: string;
  razorpayPayoutId?: string;
  failureReason?: string;
};

export type PractitionerWalletSnapshot = {
  walletId: string;
  availableBalance: number;
  pendingPayout: number;
  heldBalance: number;
  totalEarned: number;
  commissionRate: number;
  bankAccountLabel: string;
  nextPayoutDate: string;
  transactions: PractitionerWalletTransaction[];
  payouts: PractitionerPayout[];
  activePayoutCount: number;
};

export type PractitionerStats = {
  upcomingSessions: number;
  completedThisMonth: number;
  walletBalance: number;
  pendingPayout: number;
  totalSessions: number;
  sessionsThisWeek: number;
  earnedThisMonth: number;
};

export type WeeklySessionPoint = { day: string; amount: number };

export type PractitionerHomeReview = {
  id: string;
  userName: string;
  service: string;
  rating: number;
  text: string;
  date: string;
  providerReply?: string;
};

export type OfferingAvailabilityInput = {
  alwaysAvailable: boolean;
  selectedDates: string[];
  timingMode: "same" | "custom";
  globalTiming: { start: string; end: string };
  dateTimings: Record<string, { start: string; end: string }>;
};

export type OfferingAvailabilityState = OfferingAvailabilityInput;

export type PractitionerDashboard = {
  weeklySessions: WeeklySessionPoint[];
  monthlyEarnings: number;
  monthlyGrowthPct: number;
  avgRating: number;
  reviewCount: number;
  reviews: PractitionerHomeReview[];
  clientsBookedToday: number;
};

/** User-facing session history row (from bookings). */
export type UserSessionHistory = {
  id: string;
  practitionerId?: string;
  practitionerName: string;
  serviceType: string;
  date: string;
  status: PractitionerSessionStatus;
  duration: string;
  price: string;
  time: string;
  meetingLink?: string;
  paymentStatus?: BookingPaymentStatus;
};
