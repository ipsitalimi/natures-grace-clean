export type NotificationLinkRoute =
  | "SessionHistory"
  | "SessionDetail"
  | "OrderHistory"
  | "OrderDetail"
  | "Main"
  | "SellerOnboarding"
  | "SellerMain"
  | "PractitionerOnboarding"
  | "PractitionerMain"
  | "ApplicationStatus";

export interface NotificationItem {
  id: string;
  message: string;
  time: string;
  unread: boolean;
  linkRoute?: NotificationLinkRoute | null;
  linkTargetId?: string | null;
}
