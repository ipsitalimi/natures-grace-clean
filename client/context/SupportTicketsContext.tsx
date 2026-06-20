import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  CreateSupportTicketInput,
  SupportTicket,
  SupportTicketView,
  TicketPriority,
  TicketStatus,
} from "@/data/supportTickets";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as supportTicketsService from "@/services/support/supportTicketsService";

interface SupportTicketsContextType {
  tickets: SupportTicket[];
  ticketViews: SupportTicketView[];
  ticketsLoading: boolean;
  ticketsError: string | null;
  refreshTickets: () => Promise<void>;
  createTicket: (input: CreateSupportTicketInput) => Promise<SupportTicket | null>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<boolean>;
  updateTicketPriority: (ticketId: string, priority: TicketPriority) => Promise<boolean>;
  addStaffReply: (ticketId: string, body: string) => Promise<boolean>;
}

const SupportTicketsContext = createContext<SupportTicketsContextType | null>(null);

export function SupportTicketsProvider({ children }: { children: React.ReactNode }) {
  const { session, profile, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(isSupabaseConfigured());
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const refreshTickets = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setTickets([]);
      setTicketsLoading(false);
      setTicketsError(null);
      return;
    }

    if (!session?.user) {
      setTickets([]);
      setTicketsLoading(false);
      setTicketsError(null);
      return;
    }

    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const isAdmin = profile?.role === "Admin";
      const rows = isAdmin
        ? await supportTicketsService.fetchAllTickets()
        : await supportTicketsService.fetchMyTickets();
      setTickets(rows);
    } catch (err) {
      setTicketsError(
        err instanceof Error ? err.message : "Could not load support tickets"
      );
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, [session?.user?.id, profile?.role]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshTickets();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshTickets();
  }, [refreshTickets, authConfigured, authLoading, session?.user?.id]);

  const ticketViews = useMemo(
    () => tickets.map(supportTicketsService.ticketToView),
    [tickets]
  );

  const createTicket = useCallback(
    async (input: CreateSupportTicketInput) => {
      if (!isSupabaseConfigured() || !session?.user) return null;
      const created = await supportTicketsService.createTicket(input);
      if (created) {
        setTickets((prev) => [created, ...prev]);
      }
      return created;
    },
    [session?.user]
  );

  const updateTicketStatus = useCallback(async (ticketId: string, status: TicketStatus) => {
    if (!isSupabaseConfigured()) return false;
    const ok = await supportTicketsService.updateTicketStatus(ticketId, status);
    if (ok) {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
      );
    }
    return ok;
  }, []);

  const updateTicketPriority = useCallback(
    async (ticketId: string, priority: TicketPriority) => {
      if (!isSupabaseConfigured()) return false;
      const ok = await supportTicketsService.updateTicketPriority(ticketId, priority);
      if (ok) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, priority } : t))
        );
      }
      return ok;
    },
    []
  );

  const addStaffReply = useCallback(
    async (ticketId: string, body: string) => {
      if (!isSupabaseConfigured()) return false;
      const authorName = profile?.full_name?.trim() || "Support";
      const message = await supportTicketsService.addStaffReply(
        ticketId,
        body,
        authorName
      );
      if (!message) return false;
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, messages: [...t.messages, message] } : t
        )
      );
      return true;
    },
    [profile?.full_name]
  );

  return (
    <SupportTicketsContext.Provider
      value={{
        tickets,
        ticketViews,
        ticketsLoading,
        ticketsError,
        refreshTickets,
        createTicket,
        updateTicketStatus,
        updateTicketPriority,
        addStaffReply,
      }}
    >
      {children}
    </SupportTicketsContext.Provider>
  );
}

export function useSupportTickets() {
  const ctx = useContext(SupportTicketsContext);
  if (!ctx) {
    throw new Error("useSupportTickets must be used within SupportTicketsProvider");
  }
  return ctx;
}
