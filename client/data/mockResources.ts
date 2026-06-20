export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  section: string;
  actionLabel: string;
  duration?: string;
  body: string;
  price?: string;
  url?: string;
  published?: boolean;
  instructorName?: string;
  locations?: string;
  certificateNote?: string;
}
