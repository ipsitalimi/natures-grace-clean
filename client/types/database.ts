export type UserRole = "User" | "Practitioner" | "Seller" | "Admin";
export type AccountStatus = "Active" | "Inactive" | "Suspended";
export type ApprovalStatus = "Approved" | "Pending" | "Rejected";

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: AccountStatus;
  phone: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  accepted_user_terms: boolean;
  accepted_user_terms_version: string | null;
  accepted_user_terms_timestamp: string | null;
  accepted_privacy_policy: boolean;
  accepted_privacy_version: string | null;
  accepted_privacy_timestamp: string | null;
  accepted_refund_policy: boolean;
  accepted_refund_version: string | null;
  accepted_refund_timestamp: string | null;
  accepted_medical_disclaimer: boolean;
  accepted_medical_version: string | null;
  accepted_medical_timestamp: string | null;
  accepted_account_deletion_policy: boolean;
  accepted_account_deletion_version: string | null;
  accepted_account_deletion_timestamp: string | null;
  accepted_grievance_policy: boolean;
  accepted_grievance_version: string | null;
  accepted_grievance_timestamp: string | null;
  accepted_community_guidelines: boolean;
  accepted_community_guidelines_version: string | null;
  accepted_community_guidelines_timestamp: string | null;
  accepted_shipping_policy: boolean;
  accepted_shipping_version: string | null;
  accepted_shipping_timestamp: string | null;
  accepted_practitioner_agreement: boolean;
  accepted_practitioner_version: string | null;
  accepted_practitioner_timestamp: string | null;
  accepted_seller_agreement: boolean;
  accepted_seller_version: string | null;
  accepted_seller_timestamp: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformSettingsRow {
  id: string;
  settings: Record<string, unknown>;
  home_content: Record<string, unknown>;
  product_approvals: Record<string, ApprovalStatus>;
  practitioner_meta: Record<string, unknown>;
  event_visibility: Record<string, boolean>;
  resource_published: Record<string, boolean>;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; email: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      platform_settings: {
        Row: PlatformSettingsRow;
        Insert: {
          id?: string;
          settings?: Record<string, unknown>;
          home_content?: Record<string, unknown>;
          product_approvals?: Record<string, ApprovalStatus>;
          practitioner_meta?: Record<string, unknown>;
          event_visibility?: Record<string, boolean>;
          resource_published?: Record<string, boolean>;
          updated_at?: string;
        };
        Update: Partial<PlatformSettingsRow>;
        Relationships: [];
      };
      practitioners: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      sellers: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      products: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      events: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      resources: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      prompts: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      notifications: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
