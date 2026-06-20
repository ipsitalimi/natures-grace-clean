import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ResourceEnrollment } from "@/data/resourceEnrollments";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as resourceEnrollmentsService from "@/services/content/resourceEnrollmentsService";

interface ResourceEnrollmentsContextType {
  enrollments: ResourceEnrollment[];
  enrollmentsLoading: boolean;
  enrollmentsError: string | null;
  refreshEnrollments: () => Promise<void>;
  isEnrolledForResource: (resourceId: string) => boolean;
  getEnrollmentForResource: (resourceId: string) => ResourceEnrollment | undefined;
  enrollForResource: (resourceId: string) => Promise<ResourceEnrollment | null>;
  cancelEnrollmentForResource: (resourceId: string) => Promise<boolean>;
  toggleEnrollment: (resourceId: string) => Promise<boolean>;
}

const ResourceEnrollmentsContext = createContext<ResourceEnrollmentsContextType | null>(null);

export function ResourceEnrollmentsProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const [enrollments, setEnrollments] = useState<ResourceEnrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(isSupabaseConfigured());
  const [enrollmentsError, setEnrollmentsError] = useState<string | null>(null);

  const refreshEnrollments = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setEnrollments([]);
      setEnrollmentsLoading(false);
      setEnrollmentsError(null);
      return;
    }

    if (!session?.user) {
      setEnrollments([]);
      setEnrollmentsLoading(false);
      setEnrollmentsError(null);
      return;
    }

    setEnrollmentsLoading(true);
    setEnrollmentsError(null);
    try {
      const rows = await resourceEnrollmentsService.fetchMyEnrollments();
      setEnrollments(rows);
    } catch (err) {
      setEnrollmentsError(
        err instanceof Error ? err.message : "Could not load resource enrollments"
      );
      setEnrollments([]);
    } finally {
      setEnrollmentsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshEnrollments();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshEnrollments();
  }, [refreshEnrollments, authConfigured, authLoading, session?.user?.id]);

  const activeResourceIds = useMemo(
    () => resourceEnrollmentsService.activeEnrollmentResourceIds(enrollments),
    [enrollments]
  );

  const getEnrollmentForResource = useCallback(
    (resourceId: string) => {
      if (!session?.user) return undefined;
      return enrollments.find(
        (e) => e.resourceId === resourceId && e.userId === session.user.id && e.status === "Enrolled"
      );
    },
    [enrollments, session?.user?.id]
  );

  const isEnrolledForResource = useCallback(
    (resourceId: string) => activeResourceIds.has(resourceId),
    [activeResourceIds]
  );

  const enrollForResource = useCallback(
    async (resourceId: string) => {
      if (!isSupabaseConfigured() || !session?.user) return null;
      const created = await resourceEnrollmentsService.enrollForResource(resourceId);
      if (created) {
        setEnrollments((prev) => {
          const without = prev.filter(
            (e) => !(e.resourceId === created.resourceId && e.userId === created.userId)
          );
          return [created, ...without];
        });
      }
      return created;
    },
    [session?.user]
  );

  const cancelEnrollmentForResource = useCallback(
    async (resourceId: string) => {
      if (!isSupabaseConfigured() || !session?.user) return false;
      await resourceEnrollmentsService.cancelEnrollmentForResource(resourceId);
      setEnrollments((prev) =>
        prev.map((e) =>
          e.resourceId === resourceId && e.userId === session.user.id && e.status === "Enrolled"
            ? { ...e, status: "Cancelled" }
            : e
        )
      );
      return true;
    },
    [session?.user]
  );

  const toggleEnrollment = useCallback(
    async (resourceId: string) => {
      if (isEnrolledForResource(resourceId)) {
        await cancelEnrollmentForResource(resourceId);
        return false;
      }
      await enrollForResource(resourceId);
      return true;
    },
    [isEnrolledForResource, cancelEnrollmentForResource, enrollForResource]
  );

  return (
    <ResourceEnrollmentsContext.Provider
      value={{
        enrollments,
        enrollmentsLoading,
        enrollmentsError,
        refreshEnrollments,
        isEnrolledForResource,
        getEnrollmentForResource,
        enrollForResource,
        cancelEnrollmentForResource,
        toggleEnrollment,
      }}
    >
      {children}
    </ResourceEnrollmentsContext.Provider>
  );
}

export function useResourceEnrollments() {
  const ctx = useContext(ResourceEnrollmentsContext);
  if (!ctx) {
    throw new Error("useResourceEnrollments must be used within ResourceEnrollmentsProvider");
  }
  return ctx;
}
