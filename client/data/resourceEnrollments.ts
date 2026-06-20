/** Resource enrollment types (Supabase-backed). */

export type ResourceEnrollmentStatus = "Enrolled" | "Cancelled";

export interface ResourceEnrollment {
  id: string;
  resourceId: string;
  userId: string;
  status: ResourceEnrollmentStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
