/** Role application types (Supabase-backed). */

export type RoleApplicationTarget = "Practitioner" | "Seller";
export type RoleApplicationStatus = "Pending" | "Approved" | "Rejected";

export type ApplicationProgressStage =
  | "submitted"
  | "documents_received"
  | "under_review"
  | "verification"
  | "approved"
  | "rejected";

export type PractitionerApplicationForm = {
  fullName: string;
  email: string;
  phone: string;
  category: string;
  experience: string;
  certifications: string;
  sessionTypes: string;
  priceRange: string;
  bio: string;
  whyJoin: string;
  availability: string;
};

export type SellerApplicationForm = {
  fullName: string;
  email: string;
  phone: string;
  brandName: string;
  category: string;
  productTypes: string;
  description: string;
  website: string;
  whyJoin: string;
};

export type RoleApplicationFormData = PractitionerApplicationForm | SellerApplicationForm;

export interface RoleApplication {
  id: string;
  userId: string;
  targetRole: RoleApplicationTarget;
  status: RoleApplicationStatus;
  progressStage: ApplicationProgressStage;
  rejectionReason: string | null;
  formData: Record<string, string>;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
