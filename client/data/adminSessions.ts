/** Admin dashboard upcoming session row (from `practitioner_bookings`). */

export type AdminSessionStatus = "Upcoming" | "Completed" | "Cancelled";

export interface AdminUpcomingSession {
  id: string;
  userName: string;
  practitionerName: string;
  service: string;
  date: string;
  time: string;
  status: AdminSessionStatus;
  duration: string;
  paymentStatus?: "Pending" | "Paid" | "Refunded";
  bookingStatus?: "Pending" | "Confirmed" | "Completed" | "Cancelled";
}
