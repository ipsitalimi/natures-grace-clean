import { getSupabase } from "@/lib/supabase";

export type FaqCategoryRow = {
  id: string;
  slug: string;
  title: string;
  sort_order: number;
  is_active: boolean;
};

export type FaqItemRow = {
  id: string;
  category_id: string | null;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
};

export type PublishedFaqSection = {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  items: { id: string; question: string; answer: string; sortOrder: number }[];
};

/** Shown in user UI when Supabase succeeded but key is empty (seed / Admin fills content). */
export const SUPPORT_COPY_EMPTY_DISPLAY = "—";

export const TICKET_SUBMIT_CONFIRMATION_KEY = "ticket_submit_confirmation";

/** Login screen — tagline under logo */
export const LOGIN_TAGLINE_KEY = "login_tagline";

/** About screen — header under logo */
export const ABOUT_APP_NAME_KEY = "about_app_name";
export const ABOUT_APP_VERSION_KEY = "about_app_version";
export const ABOUT_MISSION_SECTION_TITLE_KEY = "about_mission_section_title";

/** Contact screen — info strip labels, sections, form copy */
export const CONTACT_INFO_LABEL_EMAIL_KEY = "contact_info_label_email";
export const CONTACT_INFO_LABEL_PHONE_KEY = "contact_info_label_phone";
export const CONTACT_INFO_LABEL_HOURS_KEY = "contact_info_label_hours";
export const CONTACT_SECTION_YOUR_TICKETS_KEY = "contact_section_your_tickets";
export const CONTACT_SECTION_SEND_MESSAGE_KEY = "contact_section_send_message";
export const CONTACT_FORM_LABEL_NAME_KEY = "contact_form_label_name";
export const CONTACT_FORM_LABEL_SUBJECT_KEY = "contact_form_label_subject";
export const CONTACT_FORM_LABEL_MESSAGE_KEY = "contact_form_label_message";
export const CONTACT_FORM_PLACEHOLDER_NAME_KEY = "contact_form_placeholder_name";
export const CONTACT_FORM_PLACEHOLDER_SUBJECT_KEY = "contact_form_placeholder_subject";
export const CONTACT_FORM_PLACEHOLDER_MESSAGE_KEY = "contact_form_placeholder_message";
export const CONTACT_FORM_BUTTON_SEND_KEY = "contact_form_button_send";

/** Settings → About row label (same key as Support hub About card title). */
export const SETTINGS_ABOUT_ROW_KEY = "support_hub_about_title";
export const SUPPORT_HUB_HELP_TITLE_KEY = "support_hub_help_title";
export const SUPPORT_HUB_CONTACT_TITLE_KEY = "support_hub_contact_title";

export type SupportCopyEditorField = { key: string; label: string; multiline?: boolean };

export type SupportCopyEditorSection = { id: string; title: string; fields: SupportCopyEditorField[] };

export const SUPPORT_COPY_EDITOR_SECTIONS: SupportCopyEditorSection[] = [
  {
    id: "hub",
    title: "Support hub (three cards)",
    fields: [
      { key: SUPPORT_HUB_HELP_TITLE_KEY, label: "Help card / Settings row — title" },
      { key: "support_hub_help_description", label: "Help card — subtitle", multiline: true },
      { key: SUPPORT_HUB_CONTACT_TITLE_KEY, label: "Contact card / Settings row — title" },
      { key: "support_hub_contact_description", label: "Contact card — subtitle", multiline: true },
      { key: SETTINGS_ABOUT_ROW_KEY, label: "About card / Settings row — title" },
      { key: "support_hub_about_description", label: "About card — subtitle", multiline: true },
    ],
  },
  {
    id: "contact",
    title: "Contact page (info strip)",
    fields: [
      { key: CONTACT_INFO_LABEL_EMAIL_KEY, label: "Email row — label" },
      { key: "support_email", label: "Email row — value" },
      { key: CONTACT_INFO_LABEL_PHONE_KEY, label: "Phone row — label" },
      { key: "support_phone", label: "Phone row — value" },
      { key: CONTACT_INFO_LABEL_HOURS_KEY, label: "Hours row — label" },
      { key: "support_hours", label: "Hours row — value", multiline: true },
    ],
  },
  {
    id: "contact_form",
    title: "Contact page (form & sections)",
    fields: [
      { key: CONTACT_SECTION_YOUR_TICKETS_KEY, label: "Your tickets — section heading" },
      { key: CONTACT_SECTION_SEND_MESSAGE_KEY, label: "Send message — section heading" },
      { key: CONTACT_FORM_LABEL_NAME_KEY, label: "Name — field label" },
      { key: CONTACT_FORM_PLACEHOLDER_NAME_KEY, label: "Name — placeholder" },
      { key: CONTACT_FORM_LABEL_SUBJECT_KEY, label: "Subject — field label" },
      { key: CONTACT_FORM_PLACEHOLDER_SUBJECT_KEY, label: "Subject — placeholder" },
      { key: CONTACT_FORM_LABEL_MESSAGE_KEY, label: "Message — field label" },
      { key: CONTACT_FORM_PLACEHOLDER_MESSAGE_KEY, label: "Message — placeholder", multiline: true },
      { key: CONTACT_FORM_BUTTON_SEND_KEY, label: "Send button" },
    ],
  },
  {
    id: "login",
    title: "Login",
    fields: [{ key: LOGIN_TAGLINE_KEY, label: "Tagline (under logo)" }],
  },
  {
    id: "about",
    title: "About page",
    fields: [
      { key: ABOUT_APP_NAME_KEY, label: "App name (under logo)" },
      { key: ABOUT_APP_VERSION_KEY, label: "Version line (display text)" },
      { key: "about_intro", label: "Intro paragraph", multiline: true },
      { key: ABOUT_MISSION_SECTION_TITLE_KEY, label: "Mission section — heading" },
      { key: "about_mission", label: "Mission body", multiline: true },
      { key: "about_badge_title", label: "Badge title" },
      { key: "about_badge_text", label: "Badge text", multiline: true },
    ],
  },
  {
    id: "ticket_confirm",
    title: "After ticket submit",
    fields: [{ key: TICKET_SUBMIT_CONFIRMATION_KEY, label: "Confirmation message (Contact)", multiline: true }],
  },
];

export function allSupportCopyEditorKeys(): string[] {
  const keys: string[] = [];
  for (const sec of SUPPORT_COPY_EDITOR_SECTIONS) {
    for (const f of sec.fields) keys.push(f.key);
  }
  return keys;
}

export function emptySupportCopyDrafts(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of allSupportCopyEditorKeys()) {
    o[k] = "";
  }
  return o;
}

/** Raw rows from DB only — no merged client fallback. */
export async function fetchSupportCopyMap(): Promise<
  { ok: true; map: Record<string, string> } | { ok: false; error: string }
> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data, error } = await supabase.from("support_copy").select("key, body");

  if (error) {
    console.error("[helpSupportService] support_copy:", error.message);
    return { ok: false, error: error.message };
  }

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const k = (row as { key: string; body: string }).key;
    const body = (row as { key: string; body: string }).body;
    if (k) map[k] = body ?? "";
  }
  return { ok: true, map };
}

export function getSupportCopyKey(map: Record<string, string> | null | undefined, key: string): string {
  const raw = map?.[key];
  return raw?.trim() ?? "";
}

export function formatSupportCopyForDisplay(raw: string, emptyPlaceholder = SUPPORT_COPY_EMPTY_DISPLAY): string {
  const t = raw.trim();
  return t ? raw : emptyPlaceholder;
}

/** Short UI label from copy map; use `showEmpty` when load succeeded but key is blank. */
export function formatSupportCopyLabel(
  raw: string,
  opts?: { showEmpty?: boolean; emptyPlaceholder?: string }
): string {
  const t = raw.trim();
  if (t) return raw;
  if (opts?.showEmpty) return opts.emptyPlaceholder ?? SUPPORT_COPY_EMPTY_DISPLAY;
  return "";
}

export async function upsertSupportCopy(key: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase.from("support_copy").upsert({ key, body: body.trim(), updated_at: new Date().toISOString() });

  if (error) {
    console.error("[helpSupportService] upsertSupportCopy:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function fetchPublishedFaqSections(): Promise<
  { ok: true; sections: PublishedFaqSection[] } | { ok: false; error: string }
> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data: cats, error: ec } = await supabase
    .from("faq_categories")
    .select("id, slug, title, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (ec) {
    console.error("[helpSupportService] categories:", ec.message);
    return { ok: false, error: ec.message };
  }

  const { data: items, error: ei } = await supabase
    .from("faq_items")
    .select("id, category_id, question, answer, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (ei) {
    console.error("[helpSupportService] faq_items:", ei.message);
    return { ok: false, error: ei.message };
  }

  type FaqItemSubset = Pick<FaqItemRow, "id" | "category_id" | "question" | "answer" | "sort_order">;
  const itemRows = (items ?? []) as FaqItemSubset[];

  const sections: PublishedFaqSection[] = (cats ?? []).map((c: FaqCategoryRow) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    sortOrder: c.sort_order,
    items: itemRows
      .filter((it) => it.category_id === c.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((it) => ({
        id: it.id,
        question: it.question,
        answer: it.answer,
        sortOrder: it.sort_order,
      })),
  }));

  return { ok: true, sections };
}

export async function fetchAdminFaqDataset(): Promise<
  | { ok: true; categories: FaqCategoryRow[]; items: FaqItemRow[] }
  | { ok: false; error: string }
> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data: cats, error: ec } = await supabase.from("faq_categories").select("*").order("sort_order", { ascending: true });

  if (ec) return { ok: false, error: ec.message };

  const { data: items, error: ei } = await supabase.from("faq_items").select("*").order("sort_order", { ascending: true });

  if (ei) return { ok: false, error: ei.message };

  return {
    ok: true,
    categories: (cats ?? []) as FaqCategoryRow[],
    items: (items ?? []) as FaqItemRow[],
  };
}

export async function createFaqItem(input: {
  categoryId: string | null;
  question: string;
  answer: string;
  sortOrder?: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const q = input.question.trim();
  if (!q) return { ok: false, error: "Question is required." };

  let sortOrder = input.sortOrder;
  if (sortOrder == null) {
    let maxQ = supabase.from("faq_items").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    if (input.categoryId == null) {
      maxQ = maxQ.is("category_id", null);
    } else {
      maxQ = maxQ.eq("category_id", input.categoryId);
    }
    const { data } = await maxQ.maybeSingle();
    sortOrder = ((data as { sort_order: number } | null)?.sort_order ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("faq_items")
    .insert({
      category_id: input.categoryId,
      question: q,
      answer: input.answer.trim(),
      sort_order: sortOrder,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateFaqItem(
  id: string,
  patch: Partial<Pick<FaqItemRow, "question" | "answer" | "sort_order" | "is_active" | "category_id">>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase.from("faq_items").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteFaqItem(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase.from("faq_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Swap sort_order with the previous or next item in the same category (admin). */
export async function moveFaqItem(
  itemId: string,
  direction: "up" | "down"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data: self, error: e1 } = await supabase.from("faq_items").select("*").eq("id", itemId).single();
  if (e1 || !self) return { ok: false, error: e1?.message ?? "Item not found" };

  const row = self as FaqItemRow;
  let query = supabase.from("faq_items").select("*");
  if (row.category_id == null) {
    query = query.is("category_id", null);
  } else {
    query = query.eq("category_id", row.category_id);
  }
  const { data: siblings, error: e2 } = await query.order("sort_order", { ascending: true });
  if (e2 || !siblings?.length) return { ok: false, error: e2?.message ?? "No siblings" };

  const list = siblings as FaqItemRow[];
  const idx = list.findIndex((x) => x.id === itemId);
  if (idx < 0) return { ok: false, error: "Item not in list" };
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return { ok: true };

  const a = list[idx];
  const b = list[swapWith];
  const ao = a.sort_order;
  const bo = b.sort_order;
  const r1 = await updateFaqItem(a.id, { sort_order: bo });
  if (!r1.ok) return r1;
  const r2 = await updateFaqItem(b.id, { sort_order: ao });
  if (!r2.ok) return r2;
  return { ok: true };
}
