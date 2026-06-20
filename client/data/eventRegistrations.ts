/** Event registration types (Supabase-backed). */

export type EventRegistrationStatus = "Registered" | "Cancelled" | "Waitlist";
export type EventRegistrationPaymentStatus = "None" | "Pending" | "Paid" | "Refunded";

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  message: string;
  status: EventRegistrationStatus;
  paymentStatus: EventRegistrationPaymentStatus;
  createdAt: string;
}

export interface EventRegistrationInput {
  eventDbId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  message?: string;
}
