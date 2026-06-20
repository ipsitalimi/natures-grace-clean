/** Support ticket types (Supabase-backed). */

export type TicketStatus = "Open" | "In Progress" | "Resolved";
export type TicketPriority = "Low" | "Medium" | "High";

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string | null;
  authorName: string;
  authorRole: "User" | "Staff";
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  number: number;
  requesterId: string;
  requesterName: string;
  contactEmail: string;
  category: string;
  subject: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

/** UI-friendly view (admin list + contact history). */
export interface SupportTicketView {
  id: string;
  number: number;
  title: string;
  preview: string;
  fullMessage: string;
  userName: string;
  date: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  responses: { id: string; from: string; message: string; date: string }[];
}

export interface CreateSupportTicketInput {
  subject: string;
  body: string;
  requesterName: string;
  contactEmail?: string;
  category?: string;
  priority?: TicketPriority;
}
