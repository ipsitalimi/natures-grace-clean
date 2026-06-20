import type {
  CreateSupportTicketInput,
  SupportTicket,
  SupportTicketView,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from "@/data/supportTickets";
import { getSupabase } from "@/lib/supabase";

export type DbSupportTicketRow = {
  id: string;
  ticket_number: number;
  requester_id: string;
  requester_name: string;
  contact_email: string;
  category: string;
  subject: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  ticket_messages?: DbTicketMessageRow[];
};

export type DbTicketMessageRow = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string;
  author_role: "User" | "Staff";
  body: string;
  created_at: string;
};

function formatTicketDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function mapMessage(row: DbTicketMessageRow): TicketMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapTicket(row: DbSupportTicketRow): SupportTicket {
  const messages = (row.ticket_messages ?? [])
    .map(mapMessage)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    id: row.id,
    number: row.ticket_number,
    requesterId: row.requester_id,
    requesterName: row.requester_name,
    contactEmail: row.contact_email,
    category: row.category,
    subject: row.subject,
    body: row.body,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages,
  };
}

export function ticketToView(ticket: SupportTicket): SupportTicketView {
  const preview =
    ticket.body.length > 72 ? `${ticket.body.slice(0, 72).trim()}…` : ticket.body;
  return {
    id: ticket.id,
    number: ticket.number,
    title: ticket.subject,
    preview,
    fullMessage: ticket.body,
    userName: ticket.requesterName,
    date: formatTicketDate(ticket.createdAt),
    status: ticket.status,
    priority: ticket.priority,
    assigneeId: ticket.assigneeId,
    responses: ticket.messages.map((m) => ({
      id: m.id,
      from: m.authorName,
      message: m.body,
      date: formatTicketDate(m.createdAt),
    })),
  };
}

const TICKET_SELECT = `
  *,
  ticket_messages (*)
`;

export async function fetchMyTickets(): Promise<SupportTicket[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("support_tickets")
    .select(TICKET_SELECT)
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[supportTicketsService] fetch mine:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbSupportTicketRow[]).map(mapTicket);
}

export async function fetchAllTickets(): Promise<SupportTicket[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("support_tickets")
    .select(TICKET_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[supportTicketsService] fetch all:", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as DbSupportTicketRow[]).map(mapTicket);
}

export async function createTicket(
  input: CreateSupportTicketInput
): Promise<SupportTicket | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      requester_id: user.id,
      requester_name: input.requesterName.trim(),
      contact_email: (input.contactEmail ?? user.email ?? "").trim(),
      category: input.category?.trim() || "General",
      subject: input.subject.trim(),
      body: input.body.trim(),
      status: "Open",
      priority: input.priority ?? "Medium",
    })
    .select(TICKET_SELECT)
    .single();

  if (error) {
    console.error("[supportTicketsService] create:", error.message);
    return null;
  }

  return mapTicket(data as DbSupportTicketRow);
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("support_tickets")
    .update({ status })
    .eq("id", ticketId);

  if (error) {
    console.error("[supportTicketsService] update status:", error.message);
    return false;
  }
  return true;
}

export async function updateTicketPriority(
  ticketId: string,
  priority: TicketPriority
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("support_tickets")
    .update({ priority })
    .eq("id", ticketId);

  if (error) {
    console.error("[supportTicketsService] update priority:", error.message);
    return false;
  }
  return true;
}

export async function updateTicketAssignee(
  ticketId: string,
  assigneeId: string | null
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("support_tickets")
    .update({ assignee_id: assigneeId })
    .eq("id", ticketId);

  if (error) {
    console.error("[supportTicketsService] update assignee:", error.message);
    return false;
  }
  return true;
}

export async function addStaffReply(
  ticketId: string,
  body: string,
  authorName: string
): Promise<TicketMessage | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      author_name: authorName.trim() || "Support",
      author_role: "Staff",
      body: body.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("[supportTicketsService] staff reply:", error.message);
    return null;
  }

  return mapMessage(data as DbTicketMessageRow);
}

export type AdminFirstResponseStatsResult =
  | { ok: true; avgHours: number | null; sampleCount: number }
  | { ok: false; error: string };

/** Readable label for avg hours since ticket created → first Staff message (Admin stat chip). */
export function formatAvgFirstResponseHours(avgHours: number): string {
  if (!Number.isFinite(avgHours) || avgHours < 0) return "";
  const minutes = avgHours * 60;
  if (minutes < 1) return "<1 min";
  if (avgHours < 1) return `${Math.max(1, Math.round(minutes))} min`;
  if (avgHours < 24) return `${avgHours.toFixed(1)} hrs`;
  return `${(avgHours / 24).toFixed(1)} d`;
}

/** RPC `admin_first_response_stats` — admin-only; averages over tickets with ≥1 Staff message. */
export async function fetchAdminFirstResponseStats(): Promise<AdminFirstResponseStatsResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data, error } = await supabase.rpc("admin_first_response_stats");

  if (error) {
    console.error("[supportTicketsService] admin_first_response_stats:", error.message);
    return { ok: false, error: error.message };
  }

  const payload = data as Record<string, unknown> | string | number | null;
  const obj =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  if (!obj) return { ok: false, error: "Invalid metric response." };

  if (obj.error === "forbidden") return { ok: false, error: "Not authorized." };

  const sampleCount = Number(obj.sample_count) || 0;
  const avgRaw = obj.avg_hours;

  let avgHours: number | null = null;
  if (avgRaw != null && avgRaw !== "") {
    const n =
      typeof avgRaw === "number"
        ? avgRaw
        : typeof avgRaw === "string"
          ? Number.parseFloat(avgRaw)
          : NaN;
    if (Number.isFinite(n)) avgHours = n;
  }

  return { ok: true, avgHours: sampleCount > 0 ? avgHours : null, sampleCount };
}
