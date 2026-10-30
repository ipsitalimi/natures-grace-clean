import {
  findCategoryTemplate,
  normalizeCategoryKey,
  type Category,
  type Practitioner,
} from "@/data/practitioners";

export type PractitionerSpecialty = {
  category: string;
  subcategory: string;
};

/** Parse specialties from DB JSON, legacy columns, or application form strings. */
export function parseSpecialtiesFromFormData(
  form: Record<string, string | undefined>
): PractitionerSpecialty[] {
  const category = (form.category ?? "").trim();
  if (!category) return [];

  const raw = form.subcategories ?? form.subcategory ?? form.sessionTypes ?? "";
  const names = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const unique = [...new Set(names)];
  return unique.map((subcategory) => ({ category, subcategory }));
}

export function parseSpecialtiesFromPractitioner(
  practitioner: Pick<Practitioner, "category" | "subcategory" | "specialties">
): PractitionerSpecialty[] {
  if (practitioner.specialties?.length) {
    return practitioner.specialties;
  }
  const category = practitioner.category?.trim();
  const subcategory = practitioner.subcategory?.trim();
  if (category && subcategory) {
    return [{ category, subcategory }];
  }
  return [];
}

export function getApprovedSubcategoryNames(
  practitioner: Pick<Practitioner, "category" | "subcategory" | "specialties">
): string[] {
  const names = parseSpecialtiesFromPractitioner(practitioner).map((s) => s.subcategory);
  return [...new Set(names)];
}

/** Legacy subcategory display names mapped to current canonical names. */
const SUBCATEGORY_ALIASES: Record<string, string> = {
  "signature analysis": "Signatures / Handwriting Analysis",
};

function normalizeSubcategoryName(name: string): string {
  const trimmed = name.trim();
  const aliased = SUBCATEGORY_ALIASES[trimmed.toLowerCase()];
  return aliased ?? trimmed;
}

export function practitionerMatchesSubcategory(
  practitioner: Pick<Practitioner, "category" | "subcategory" | "specialties">,
  categoryName: string,
  subcategoryName: string
): boolean {
  const catKey = normalizeCategoryKey(categoryName);
  const sub = normalizeSubcategoryName(subcategoryName);
  return parseSpecialtiesFromPractitioner(practitioner).some(
    (s) =>
      normalizeCategoryKey(s.category) === catKey &&
      normalizeSubcategoryName(s.subcategory) === sub
  );
}

export function practitionerMatchesSubcategoryOnly(
  practitioner: Pick<Practitioner, "category" | "subcategory" | "specialties">,
  subcategoryName: string
): boolean {
  const sub = normalizeSubcategoryName(subcategoryName);
  return parseSpecialtiesFromPractitioner(practitioner).some(
    (s) => normalizeSubcategoryName(s.subcategory) === sub
  );
}

export function countPractitionersInSubcategory(
  practitioners: Practitioner[],
  categoryName: string,
  subcategoryName: string
): number {
  return practitioners.filter((p) =>
    practitionerMatchesSubcategory(p, categoryName, subcategoryName)
  ).length;
}

export function specialtiesToJson(
  specialties: PractitionerSpecialty[]
): { category: string; subcategory: string }[] {
  const seen = new Set<string>();
  const out: PractitionerSpecialty[] = [];
  for (const s of specialties) {
    const key = `${normalizeCategoryKey(s.category)}::${s.subcategory}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ category: s.category.trim(), subcategory: s.subcategory.trim() });
  }
  return out;
}

export function mergeSpecialtyLists(
  existing: PractitionerSpecialty[],
  incoming: PractitionerSpecialty[]
): PractitionerSpecialty[] {
  return specialtiesToJson([...existing, ...incoming]);
}

export function groupPractitionersByCategoryTemplates(
  practitioners: Practitioner[],
  categoryTemplates: Category[]
): Category[] {
  const templates = categoryTemplates.map((c) => ({
    ...c,
    practitioners: [] as Practitioner[],
  }));

  practitioners.forEach((p) => {
    const specialties = parseSpecialtiesFromPractitioner(p);
    const addedTo = new Set<string>();

    if (specialties.length === 0) {
      const cat = findCategoryTemplate(templates, p.category);
      if (cat && !addedTo.has(cat.id)) {
        cat.practitioners.push(p);
        addedTo.add(cat.id);
      }
      return;
    }

    specialties.forEach((s) => {
      const cat = findCategoryTemplate(templates, s.category);
      if (cat && !addedTo.has(cat.id)) {
        cat.practitioners.push(p);
        addedTo.add(cat.id);
      }
    });
  });

  return templates;
}
