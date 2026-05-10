import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { mockEvents, mockDiscussions, EventData, Discussion } from "@/data/mockEvents";
import { mockResources, ResourceItem } from "@/data/mockResources";
import { storeCategories as initialStoreCategories, StoreCategory, StoreProduct } from "@/data/storeProducts";
import { categories as initialCategories, Practitioner, Category, drNeelamLocalPhoto } from "@/data/practitioners";

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  mode: string;
  pricing: { label: string; amount: string }[];
  whatToExpect: string[];
  ctaText: string;
  bottomNote: string;
  status: "Active" | "Draft" | "Ended";
  price: string;
}

interface DataContextType {
  events: CommunityEvent[];
  addEvent: (event: Omit<CommunityEvent, "id">) => void;
  deleteEvent: (id: string) => void;

  discussions: Discussion[];

  resources: ResourceItem[];
  addResource: (resource: Omit<ResourceItem, "id">) => void;
  deleteResource: (id: string) => void;

  storeCategories: StoreCategory[];
  addProduct: (product: Omit<StoreProduct, "id"> & { id?: string }) => void;
  updateProduct: (id: string, updates: Partial<StoreProduct>) => void;
  deleteProduct: (id: string) => void;

  practitionerCategories: Category[];
  practitionersLoading: boolean;
  addPractitioner: (practitioner: Omit<Practitioner, "id" | "photo" | "localPhoto" | "reviewCount" | "availability"> & { id?: string; subcategory?: string }) => void;
  togglePractitioner: (id: string, enabled: boolean) => void;
  deletePractitioner: (id: string) => void;
}

const CATEGORY_ID_MAP: Record<string, string> = {
  "spiritual-guidance": "spiritual_guidance",
  "financial-guidance": "financial_guidance",
  "nutrition-diet": "diet_nutrition",
};

function normalizeCategoryId(id: string): string {
  return CATEGORY_ID_MAP[id] || id;
}

const DataContext = createContext<DataContextType | null>(null);

function buildInitialEvents(): CommunityEvent[] {
  const eventsArray: CommunityEvent[] = [];
  for (const key of Object.keys(mockEvents)) {
    const e = mockEvents[key];
    eventsArray.push({
      ...e,
      status: "Active",
      price: e.pricing.length > 0 ? `Rs. ${e.pricing[0].amount}` : "Free",
    });
  }
  eventsArray.push({
    id: "new-moon-meditation",
    title: "New Moon Meditation Circle",
    description: "A gentle monthly meditation gathering aligned with the new moon cycle to set intentions and connect with lunar energy.",
    date: "Monthly",
    time: "7:00 PM - 8:30 PM",
    mode: "Online",
    pricing: [],
    whatToExpect: [
      "Guided new moon meditation",
      "Intention setting ceremony",
      "Group sharing circle",
      "Moon phase awareness",
    ],
    ctaText: "Join Event",
    bottomNote: "",
    status: "Draft",
    price: "Free",
  });
  return eventsArray;
}

function buildInitialDiscussions(): Discussion[] {
  return Object.values(mockDiscussions);
}

let idCounter = 1000;
function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<CommunityEvent[]>(buildInitialEvents);
  const [discussions] = useState<Discussion[]>(buildInitialDiscussions);
  const [resources, setResources] = useState<ResourceItem[]>([...mockResources]);
  const [storeCats, setStoreCats] = useState<StoreCategory[]>(
    initialStoreCategories.map((c) => ({ ...c, products: [...c.products] }))
  );
  const [practitionerCats, setPractitionerCats] = useState<Category[]>(
    initialCategories.map((c) => ({
      ...c,
      id: normalizeCategoryId(c.id),
      practitioners: [],
    }))
  );
  const [practitionersLoading, setPractitionersLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, "practitioners"))
      .then((snapshot) => {
        const grouped: Record<string, Practitioner[]> = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isActive === false) return;
          const catId = data.categoryId || "";
          const pracName = data.name || "";
          const isNeelam = pracName.toLowerCase().includes("neelam");
          const prac: Practitioner = {
            id: doc.id,
            name: pracName,
            category: data.role || data.category || "",
            subcategory: data.subcategory || "",
            photo: data.photo || data.photoUrl || "",
            localPhoto: isNeelam ? drNeelamLocalPhoto : undefined,
            bio: data.bio || "",
            experience: data.experience || (data.experienceYears ? `${data.experienceYears} years` : ""),
            certifications: data.certifications || [],
            rating: data.rating || 0,
            reviewCount: data.reviews ?? data.reviewCount ?? 0,
            pricePerSession: data.price ?? data.pricePerSession ?? 0,
            availability: data.availability || "Available",
          };
          if (!grouped[catId]) grouped[catId] = [];
          grouped[catId].push(prac);
        });
        setPractitionerCats((prev) => {
          const updated = prev.map((cat) => {
            const firestorePracs = grouped[cat.id] || [];
            return { ...cat, practitioners: firestorePracs };
          });
          Object.keys(grouped).forEach((catId) => {
            if (!updated.find((c) => c.id === catId)) {
              updated.push({
                id: catId,
                name: catId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                subtitle: "",
                description: "",
                subcategories: [],
                practitioners: grouped[catId],
              });
            }
          });
          return updated;
        });
      })
      .catch((err) => {
        console.error("[DataContext] Failed to fetch practitioners:", err?.message || err);
      })
      .finally(() => setPractitionersLoading(false));
  }, []);

  const addEvent = useCallback((event: Omit<CommunityEvent, "id">) => {
    const newEvent: CommunityEvent = { ...event, id: generateId("evt") };
    setEvents((prev) => [...prev, newEvent]);
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addResource = useCallback((resource: Omit<ResourceItem, "id">) => {
    const newResource: ResourceItem = { ...resource, id: generateId("res") };
    setResources((prev) => [...prev, newResource]);
  }, []);

  const deleteResource = useCallback((id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addProduct = useCallback((product: Omit<StoreProduct, "id"> & { id?: string }) => {
    const newProduct: StoreProduct = {
      id: product.id || generateId("prod"),
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
    };
    setStoreCats((prev) => {
      const catIndex = prev.findIndex(
        (c) => c.name.toLowerCase() === product.category.toLowerCase()
      );
      if (catIndex >= 0) {
        const updated = [...prev];
        updated[catIndex] = {
          ...updated[catIndex],
          products: [...updated[catIndex].products, newProduct],
        };
        return updated;
      }
      const newCatId = product.category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return [
        ...prev,
        {
          id: newCatId,
          name: product.category,
          description: product.category,
          icon: "circle",
          products: [newProduct],
        },
      ];
    });
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<StoreProduct>) => {
    setStoreCats((prev) =>
      prev.map((cat) => ({
        ...cat,
        products: cat.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }))
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setStoreCats((prev) =>
      prev.map((cat) => ({
        ...cat,
        products: cat.products.filter((p) => p.id !== id),
      }))
    );
  }, []);

  const addPractitioner = useCallback(
    (practitioner: Omit<Practitioner, "id" | "photo" | "localPhoto" | "reviewCount" | "availability"> & { id?: string; subcategory?: string }) => {
      const newPrac: Practitioner = {
        id: practitioner.id || generateId("prac"),
        name: practitioner.name,
        category: practitioner.category,
        subcategory: practitioner.subcategory || "",
        photo: "",
        bio: practitioner.bio || "",
        experience: practitioner.experience,
        certifications: practitioner.certifications,
        rating: practitioner.rating || 5.0,
        reviewCount: 0,
        pricePerSession: practitioner.pricePerSession,
        availability: "Mon-Sat",
      };
      setPractitionerCats((prev) => {
        const catId = practitioner.category.toLowerCase().replace(/\s+/g, "-");
        const catIndex = prev.findIndex(
          (c) => c.id === catId || c.name.toLowerCase() === practitioner.category.toLowerCase()
        );
        if (catIndex >= 0) {
          const updated = [...prev];
          updated[catIndex] = {
            ...updated[catIndex],
            practitioners: [...updated[catIndex].practitioners, newPrac],
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: catId,
            name: practitioner.category,
            subtitle: "",
            description: `${practitioner.category} services`,
            subcategories: [],
            practitioners: [newPrac],
          },
        ];
      });
    },
    []
  );

  const togglePractitioner = useCallback((id: string, _enabled: boolean) => {
    setPractitionerCats((prev) =>
      prev.map((cat) => ({
        ...cat,
        practitioners: cat.practitioners.filter((p) => {
          if (p.id === id && !_enabled) return false;
          return true;
        }),
      }))
    );
  }, []);

  const deletePractitioner = useCallback((id: string) => {
    setPractitionerCats((prev) =>
      prev.map((cat) => ({
        ...cat,
        practitioners: cat.practitioners.filter((p) => p.id !== id),
      }))
    );
  }, []);

  const value: DataContextType = {
    events,
    addEvent,
    deleteEvent,
    discussions,
    resources,
    addResource,
    deleteResource,
    storeCategories: storeCats,
    addProduct,
    updateProduct,
    deleteProduct,
    practitionerCategories: practitionerCats,
    practitionersLoading,
    addPractitioner,
    togglePractitioner,
    deletePractitioner,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataContext must be used inside DataProvider");
  return ctx;
}
