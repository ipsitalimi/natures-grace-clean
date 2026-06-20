import type { ProfileRow } from "@/types/database";
import type { Practitioner } from "@/data/practitioners";
function profileBio(preferences: Record<string, unknown> | undefined): string {
  if (!preferences || typeof preferences !== "object") return "";
  return typeof preferences.bio === "string" ? preferences.bio : "";
}

export type ProfileCompletionItem = {
  key: string;
  label: string;
  complete: boolean;
  screen?: string;
};

export function computeProfileCompletion(
  profile: ProfileRow | null,
  role: string,
  practitioner?: Practitioner | null
): { percent: number; missing: ProfileCompletionItem[] } {
  const items: ProfileCompletionItem[] = [
    {
      key: "photo",
      label: "Photo",
      complete: Boolean(profile?.avatar_url?.trim()),
      screen: "EditProfile",
    },
    {
      key: "bio",
      label: "Bio",
      complete: Boolean(profileBio(profile?.preferences).trim()),
      screen: "EditProfile",
    },
    {
      key: "phone",
      label: "Phone",
      complete: Boolean(profile?.phone?.trim()),
      screen: "EditProfile",
    },
  ];

  if (role === "Practitioner" && practitioner) {
    items.push(
      {
        key: "certifications",
        label: "Certifications",
        complete: (practitioner.certifications?.length ?? 0) > 0,
        screen: "PractitionerProfile",
      },
      {
        key: "services",
        label: "Services",
        complete: Boolean(practitioner.subcategory?.trim()),
        screen: "SessionOfferings",
      },
      {
        key: "availability",
        label: "Availability",
        complete: Boolean(practitioner.availability?.trim()),
        screen: "SessionOfferings",
      }
    );
  }

  const completeCount = items.filter((i) => i.complete).length;
  const percent = items.length > 0 ? Math.round((completeCount / items.length) * 100) : 0;
  const missing = items.filter((i) => !i.complete);
  return { percent, missing };
}
