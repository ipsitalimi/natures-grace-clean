import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { EventRegistration, EventRegistrationInput } from "@/data/eventRegistrations";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as eventRegistrationsService from "@/services/content/eventRegistrationsService";

interface EventRegistrationsContextType {
  registrations: EventRegistration[];
  registrationsLoading: boolean;
  registrationsError: string | null;
  refreshRegistrations: () => Promise<void>;
  registerForEvent: (input: EventRegistrationInput) => Promise<EventRegistration | null>;
  cancelRegistration: (registrationId: string) => Promise<boolean>;
  getMyRegistrationForEvent: (eventDbId: string) => EventRegistration | undefined;
  getAttendeeCount: (eventDbId: string) => number;
  isRegisteredForEvent: (eventDbId: string) => boolean;
}

const EventRegistrationsContext = createContext<EventRegistrationsContextType | null>(null);

export function EventRegistrationsProvider({ children }: { children: React.ReactNode }) {
  const { session, profile, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(
    isSupabaseConfigured()
  );
  const [registrationsError, setRegistrationsError] = useState<string | null>(null);

  const refreshRegistrations = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRegistrations([]);
      setRegistrationsLoading(false);
      setRegistrationsError(null);
      return;
    }

    if (!session?.user) {
      setRegistrations([]);
      setRegistrationsLoading(false);
      setRegistrationsError(null);
      return;
    }

    setRegistrationsLoading(true);
    setRegistrationsError(null);
    try {
      const isAdmin = profile?.role === "Admin";
      const rows = isAdmin
        ? await eventRegistrationsService.fetchAllActiveRegistrations()
        : await eventRegistrationsService.fetchMyRegistrations();
      setRegistrations(rows);
    } catch (err) {
      setRegistrationsError(
        err instanceof Error ? err.message : "Could not load event registrations"
      );
      setRegistrations([]);
    } finally {
      setRegistrationsLoading(false);
    }
  }, [session?.user?.id, profile?.role]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshRegistrations();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshRegistrations();
  }, [refreshRegistrations, authConfigured, authLoading, session?.user?.id]);

  const registerForEvent = useCallback(async (input: EventRegistrationInput) => {
    if (!isSupabaseConfigured() || !session?.user) return null;
    try {
      const created = await eventRegistrationsService.registerForEvent(input);
      if (created) {
        setRegistrations((prev) => {
          const without = prev.filter(
            (r) => !(r.eventId === created.eventId && r.userId === created.userId)
          );
          return [created, ...without];
        });
      }
      return created;
    } catch (err) {
      throw err;
    }
  }, [session?.user]);

  const cancelRegistration = useCallback(
    async (registrationId: string) => {
      if (!isSupabaseConfigured()) return false;
      const ok = await eventRegistrationsService.cancelRegistration(registrationId);
      if (ok) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === registrationId ? { ...r, status: "Cancelled" } : r))
        );
      }
      return ok;
    },
    []
  );

  const getMyRegistrationForEvent = useCallback(
    (eventDbId: string) => {
      if (!session?.user) return undefined;
      return registrations.find(
        (r) =>
          r.eventId === eventDbId &&
          r.userId === session.user.id &&
          r.status === "Registered"
      );
    },
    [registrations, session?.user?.id]
  );

  const attendeeCountByEvent = useMemo(
    () => eventRegistrationsService.countRegistrationsByEvent(registrations),
    [registrations]
  );

  const getAttendeeCount = useCallback(
    (eventDbId: string) => attendeeCountByEvent.get(eventDbId) ?? 0,
    [attendeeCountByEvent]
  );

  const isRegisteredForEvent = useCallback(
    (eventDbId: string) => Boolean(getMyRegistrationForEvent(eventDbId)),
    [getMyRegistrationForEvent]
  );

  return (
    <EventRegistrationsContext.Provider
      value={{
        registrations,
        registrationsLoading,
        registrationsError,
        refreshRegistrations,
        registerForEvent,
        cancelRegistration,
        getMyRegistrationForEvent,
        getAttendeeCount,
        isRegisteredForEvent,
      }}
    >
      {children}
    </EventRegistrationsContext.Provider>
  );
}

export function useEventRegistrations() {
  const ctx = useContext(EventRegistrationsContext);
  if (!ctx) {
    throw new Error("useEventRegistrations must be used within EventRegistrationsProvider");
  }
  return ctx;
}
