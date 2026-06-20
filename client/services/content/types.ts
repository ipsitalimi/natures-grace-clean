import type { CommunityEvent } from "@/context/DataContext";
import type { ResourceItem } from "@/data/mockResources";
import type { StoreCategory, StoreProduct } from "@/data/storeProducts";
import type { Category, Practitioner } from "@/data/practitioners";
import type { DailyPrompt } from "@/context/GratitudeContext";
import type { NotificationItem } from "@/types/notifications";
import type { ModeratedReview } from "@/context/PlatformConfigContext";

export type DbEventRow = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  mode: string;
  price_label: string;
  status: string;
  is_visible: boolean;
  metadata: Record<string, unknown>;
};

export type DbProductRow = {
  id: string;
  seller_id: string | null;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: string;
  approval_status: string;
  image_url: string | null;
  metadata: Record<string, unknown>;
};

export type DbResourceRow = {
  id: string;
  title: string;
  description: string;
  section: string;
  body: string;
  duration: string | null;
  action_label: string;
  price_label: string | null;
  is_published: boolean;
  metadata?: Record<string, unknown>;
};

export type DbPractitionerRow = {
  id: string;
  profile_id: string | null;
  name: string;
  category: string;
  subcategory: string;
  bio: string;
  experience: string;
  certifications: string[];
  rating: number;
  review_count: number;
  price_per_session: number;
  photo_url: string | null;
  approval_status: string;
  is_verified: boolean;
  featured: boolean;
  is_active: boolean;
};

export type DbPromptRow = {
  id: string;
  text: string;
  date_iso: string;
  active: boolean;
};

export type DbNotificationRow = {
  id: string;
  user_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  link_route?: string | null;
  link_target_id?: string | null;
};

export type DbReviewRow = {
  id: string;
  user_id?: string | null;
  user_name: string;
  user_initial: string;
  practitioner_name: string;
  practitioner_id?: string | null;
  target_type?: string;
  product_id?: string | null;
  service_label?: string;
  booking_id?: string | null;
  rating: number;
  body: string;
  status: string;
  created_at: string;
  updated_at?: string;
};

export function eventRowToCommunityEvent(row: DbEventRow): CommunityEvent {
  const meta = row.metadata ?? {};
  const pricing = (meta.pricing as CommunityEvent["pricing"]) ?? [];
  const whatToExpect = (meta.whatToExpect as string[]) ?? [];
  const legacyId = (meta.legacy_id as string) || row.id;
  return {
    id: legacyId,
    dbId: row.id,
    title: row.title,
    description: row.description,
    date: row.event_date,
    time: row.event_time,
    mode: row.mode,
    pricing,
    whatToExpect,
    ctaText: (meta.ctaText as string) ?? "Join Event",
    bottomNote: (meta.bottomNote as string) ?? "",
    status: row.status as CommunityEvent["status"],
    price: row.price_label,
    isVisible: row.is_visible,
  };
}

export function communityEventToRow(
  event: Omit<CommunityEvent, "dbId"> & { dbId?: string }
): Omit<DbEventRow, "id"> & { id?: string } {
  return {
    id: event.dbId,
    title: event.title,
    description: event.description,
    event_date: event.date,
    event_time: event.time,
    mode: event.mode,
    price_label: event.price,
    status: event.status,
    is_visible: event.isVisible !== false,
    metadata: {
      legacy_id: event.id,
      pricing: event.pricing,
      whatToExpect: event.whatToExpect,
      ctaText: event.ctaText,
      bottomNote: event.bottomNote,
    },
  };
}

export function productRowToStoreProduct(row: DbProductRow): StoreProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    category: row.category,
    stock: row.stock,
    status: row.status as StoreProduct["status"],
    approvalStatus: row.approval_status as StoreProduct["approvalStatus"],
    imageKey: (row.metadata?.image_key as string) ?? undefined,
    imageUrl: row.image_url,
    metadata: row.metadata,
  };
}

export function resourceRowToItem(row: DbResourceRow): ResourceItem {
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    section: row.section,
    actionLabel: row.action_label,
    duration: row.duration ?? undefined,
    body: row.body,
    price: row.price_label ?? undefined,
    published: row.is_published,
    instructorName:
      typeof meta.instructorName === "string" ? meta.instructorName : undefined,
    locations: typeof meta.locations === "string" ? meta.locations : undefined,
    certificateNote:
      typeof meta.certificateNote === "string" ? meta.certificateNote : undefined,
  };
}

export function practitionerRowToPractitioner(row: DbPractitionerRow): Practitioner {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    photo: row.photo_url ?? "",
    bio: row.bio,
    experience: row.experience,
    certifications: row.certifications ?? [],
    rating: Number(row.rating),
    reviewCount: row.review_count,
    pricePerSession: Number(row.price_per_session),
    availability: "Available",
    approvalStatus: row.approval_status as Practitioner["approvalStatus"],
    isVerified: row.is_verified,
    featured: row.featured,
  };
}

export function promptRowToDaily(row: DbPromptRow): DailyPrompt {
  const d = new Date(row.date_iso + "T12:00:00");
  return {
    id: row.id,
    text: row.text,
    dateISO: row.date_iso,
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    active: row.active,
  };
}

export function notificationRowToItem(row: DbNotificationRow): NotificationItem {
  const created = new Date(row.created_at);
  const now = Date.now();
  const diffH = Math.floor((now - created.getTime()) / 3600000);
  let time = created.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diffH < 1) time = "Just now";
  else if (diffH < 24) time = `${diffH} hours ago`;
  else if (diffH < 48) time = "Yesterday";

  return {
    id: row.id,
    message: row.message,
    time,
    unread: !row.is_read,
    linkRoute: (row.link_route as NotificationItem["linkRoute"]) ?? null,
    linkTargetId: row.link_target_id ?? null,
  };
}

export function reviewRowToModerated(row: DbReviewRow): ModeratedReview {
  const created = new Date(row.created_at);
  return {
    id: row.id,
    userName: row.user_name,
    userInitial: row.user_initial,
    practitionerName: row.practitioner_name,
    rating: row.rating,
    text: row.body,
    date: created.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    status: row.status as ModeratedReview["status"],
  };
}

const CATEGORY_ICON: Record<string, string> = {
  "spiritual-manifestation": "star",
  "mindful-radiance": "sun",
  "conscious-nutrition": "heart",
  "spirit-space": "home",
  "sacred-rituals": "zap",
  "daily-vitality": "activity",
};

export function groupProductsIntoCategories(products: StoreProduct[]): StoreCategory[] {
  const byCat = new Map<string, StoreProduct[]>();
  products.forEach((p) => {
    const list = byCat.get(p.category) ?? [];
    list.push(p);
    byCat.set(p.category, list);
  });

  return Array.from(byCat.entries()).map(([name, prods]) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return {
      id,
      name,
      description: name,
      icon: CATEGORY_ICON[id] ?? "circle",
      products: prods,
    };
  });
}

export function groupPractitionersIntoCategories(
  practitioners: Practitioner[],
  categoryTemplates: Category[]
): Category[] {
  const templates = categoryTemplates.map((c) => ({
    ...c,
    practitioners: [] as Practitioner[],
  }));

  practitioners.forEach((p) => {
    const catId = p.category.toLowerCase().replace(/\s+/g, "-");
    let cat = templates.find(
      (c) => c.id === catId || c.name.toLowerCase() === p.category.toLowerCase()
    );
    if (!cat) {
      cat = {
        id: catId,
        name: p.category,
        subtitle: "",
        description: `${p.category} services`,
        subcategories: [],
        practitioners: [],
      };
      templates.push(cat);
    }
    cat.practitioners.push(p);
  });

  return templates.filter((c) => c.practitioners.length > 0);
}
