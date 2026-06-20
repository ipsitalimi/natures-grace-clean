export type LegalDocumentKey =
  | "user_terms"
  | "privacy_policy"
  | "refund_policy"
  | "medical_disclaimer"
  | "account_deletion_policy"
  | "grievance_policy"
  | "practitioner_agreement"
  | "seller_agreement"
  | "community_guidelines"
  | "shipping_policy";

export type UserMandatoryLegalKey = Exclude<
  LegalDocumentKey,
  "practitioner_agreement" | "seller_agreement"
>;

export type LegalVersions = Record<LegalDocumentKey, string>;

export const DEFAULT_LEGAL_VERSIONS: LegalVersions = {
  user_terms: "v1.0",
  privacy_policy: "v1.0",
  refund_policy: "v1.0",
  medical_disclaimer: "v1.0",
  account_deletion_policy: "v1.0",
  grievance_policy: "v1.0",
  practitioner_agreement: "v1.0",
  seller_agreement: "v1.0",
  community_guidelines: "v1.0",
  shipping_policy: "v1.0",
};

export const USER_MANDATORY_LEGAL_KEYS: UserMandatoryLegalKey[] = [
  "user_terms",
  "privacy_policy",
  "refund_policy",
  "medical_disclaimer",
  "account_deletion_policy",
  "grievance_policy",
  "community_guidelines",
  "shipping_policy",
];

export interface LegalAcceptanceRecord {
  accepted: boolean;
  version: string | null;
  timestamp: string | null;
}

export interface ProfileLegalAcceptance {
  user_terms: LegalAcceptanceRecord;
  privacy_policy: LegalAcceptanceRecord;
  refund_policy: LegalAcceptanceRecord;
  medical_disclaimer: LegalAcceptanceRecord;
  account_deletion_policy: LegalAcceptanceRecord;
  grievance_policy: LegalAcceptanceRecord;
  community_guidelines: LegalAcceptanceRecord;
  shipping_policy: LegalAcceptanceRecord;
  practitioner_agreement: LegalAcceptanceRecord;
  seller_agreement: LegalAcceptanceRecord;
}

export interface LegalAcceptanceInput {
  key: LegalDocumentKey;
  version: string;
}
