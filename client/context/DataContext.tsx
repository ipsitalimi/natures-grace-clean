import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import type { Discussion, DiscussionReply } from "@/data/discussions";
import type { ResourceItem } from "@/data/mockResources";
import type { StoreCategory, StoreProduct } from "@/data/storeProducts";
import { categories as practitionerCategoryTemplates, Practitioner, Category, emptyCategoryTemplates } from "@/data/practitioners";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { useAuth } from "@/context/AuthContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import * as eventsService from "@/services/content/eventsService";
import * as productsService from "@/services/content/productsService";
import * as resourcesService from "@/services/content/resourcesService";
import * as practitionersService from "@/services/content/practitionersService";
import * as discussionsService from "@/services/content/discussionsService";
import { groupPractitionersIntoCategories, groupProductsIntoCategories } from "@/services/content/types";
import { resolveSellerIdByProfileId } from "@/services/commerce/sellerId";
import { toSellerProduct } from "@/lib/sellerCatalog";
import type { SellerProduct } from "@/data/sellerMockData";

export interface CommunityEvent {
  id: string;
  /** Supabase UUID when synced */
  dbId?: string;
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
  isVisible?: boolean;
}

interface DataContextType {
  dataLoading: boolean;
  dataError: string | null;
  isRemoteData: boolean;
  refreshContent: (options?: { silent?: boolean }) => Promise<void>;

  events: CommunityEvent[];
  addEvent: (event: Omit<CommunityEvent, "id" | "dbId">) => Promise<boolean>;
  updateEvent: (id: string, patch: eventsService.EventUpdatePatch) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  setEventVisibility: (id: string, visible: boolean) => Promise<boolean>;

  discussions: Discussion[];
  moderationDiscussions: Discussion[];
  discussionsLoading: boolean;
  discussionsError: string | null;
  addDiscussionReply: (
    threadId: string,
    body: string,
    authorName: string,
    authorId?: string
  ) => Promise<DiscussionReply | null>;
  createDiscussion: (
    title: string,
    question: string,
    authorName: string,
    authorId?: string
  ) => Promise<Discussion | null>;
  setDiscussionModeration: (
    threadId: string,
    patch: {
      moderationStatus?: Discussion["moderationStatus"];
      visibility?: Discussion["visibility"];
    }
  ) => Promise<boolean>;

  resources: ResourceItem[];
  addResource: (resource: Omit<ResourceItem, "id">) => Promise<boolean>;
  deleteResource: (id: string) => Promise<boolean>;
  setResourcePublished: (id: string, published: boolean) => Promise<boolean>;
  updateResource: (id: string, patch: resourcesService.ResourceUpdatePatch) => Promise<boolean>;

  allProducts: StoreProduct[];
  storeCategories: StoreCategory[];
  sellerCatalog: SellerProduct[];
  refreshSellerCatalog: () => Promise<void>;
  addProduct: (product: Omit<StoreProduct, "id"> & { id?: string }) => Promise<StoreProduct | null>;
  updateProduct: (id: string, updates: Partial<StoreProduct>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;

  practitionerCategories: Category[];
  practitionersLoading: boolean;
  addPractitioner: (
    practitioner: Omit<Practitioner, "id" | "photo" | "localPhoto" | "reviewCount" | "availability"> & {
      id?: string;
      subcategory?: string;
      profileId?: string;
    }
  ) => void;
  togglePractitioner: (id: string, enabled: boolean) => void;
  deletePractitioner: (id: string) => void;
  updatePractitionerMeta: (
    id: string,
    patch: Partial<Pick<Practitioner, "approvalStatus" | "isVerified" | "featured">>
  ) => void;
  updatePractitionerBio: (id: string, bio: string) => Promise<boolean>;
  updatePractitionerPrice: (id: string, price: number) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | null>(null);

const SUPABASE_REQUIRED_MESSAGE =
  "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.";

function emptyPractitionerCategories(): Category[] {
  return emptyCategoryTemplates();
}

let idCounter = 1000;
function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, isConfigured: authConfigured, profile } = useAuth();
  const { settings: platformSettings } = usePlatformConfig();
  const [dataLoading, setDataLoading] = useState(isSupabaseConfigured());
  const [dataError, setDataError] = useState<string | null>(
    isSupabaseConfigured() ? null : SUPABASE_REQUIRED_MESSAGE
  );
  const [isRemoteData, setIsRemoteData] = useState(false);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [moderationDiscussions, setModerationDiscussions] = useState<Discussion[]>([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(isSupabaseConfigured());
  const [discussionsError, setDiscussionsError] = useState<string | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [allProducts, setAllProducts] = useState<StoreProduct[]>([]);
  const [sellerCatalogProducts, setSellerCatalogProducts] = useState<StoreProduct[]>([]);
  const [practitionerCats, setPractitionerCats] = useState<Category[]>(emptyPractitionerCategories);
  const [practitionersLoading, setPractitionersLoading] = useState(isSupabaseConfigured());

  const refreshContent = useCallback(async (options?: { silent?: boolean }) => {
    if (!isSupabaseConfigured()) {
      setDataLoading(false);
      setPractitionersLoading(false);
      setDiscussionsLoading(false);
      setDataError(SUPABASE_REQUIRED_MESSAGE);
      return;
    }

    if (!options?.silent) {
      setDataLoading(true);
      setPractitionersLoading(true);
    }
    setDataError(null);
    try {
      setDiscussionsLoading(true);
      setDiscussionsError(null);

      const [remoteEvents, remoteProducts, remoteResources, remotePractitioners, publicThreads, modThreads] =
        await Promise.all([
          eventsService.fetchEvents(),
          productsService.fetchProducts(),
          resourcesService.fetchResources(),
          practitionersService.fetchPractitioners(),
          discussionsService.fetchDiscussions(),
          discussionsService.fetchDiscussions({ forModeration: true }),
        ]);

      setDiscussions(publicThreads);
      setModerationDiscussions(modThreads);
      setEvents(remoteEvents);
      setResources(remoteResources);
      setAllProducts(remoteProducts);
      setPractitionerCats(
        groupPractitionersIntoCategories(
          remotePractitioners,
          practitionerCategoryTemplates
        )
      );
      setIsRemoteData(true);
    } catch (err) {
      console.error("[DataContext] refresh failed:", err);
      setDataError(
        err instanceof Error ? err.message : "Could not load store content. Try again."
      );
    } finally {
      if (!options?.silent) {
        setDataLoading(false);
        setPractitionersLoading(false);
      }
      setDiscussionsLoading(false);
    }
  }, []);

  const refreshSellerCatalog = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSellerCatalogProducts([]);
      return;
    }
    if (!profile?.id || profile.role !== "Seller") {
      setSellerCatalogProducts([]);
      return;
    }
    const sellerId = await resolveSellerIdByProfileId(profile.id);
    if (!sellerId) {
      setSellerCatalogProducts([]);
      return;
    }
    const products = await productsService.fetchProductsBySellerId(sellerId);
    setSellerCatalogProducts(products);
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSellerCatalogProducts([]);
      return;
    }
    if (authConfigured && authLoading) return;
    refreshSellerCatalog();
  }, [refreshSellerCatalog, authConfigured, authLoading, session?.user?.id, profile?.role]);

  const addDiscussionReply = useCallback(
    async (threadId: string, body: string, authorName: string, authorId?: string) => {
      if (!isSupabaseConfigured()) return null;
      const created = await discussionsService.insertReply({
        threadId,
        body,
        authorName,
        authorId,
      });
      if (!created) return null;

      const attach = (list: Discussion[]) =>
        list.map((d) =>
          d.id === threadId ? { ...d, replies: [...d.replies, created] } : d
        );

      setDiscussions(attach);
      setModerationDiscussions(attach);
      return created;
    },
    []
  );

  const createDiscussion = useCallback(
    async (title: string, question: string, authorName: string, authorId?: string) => {
      if (!isSupabaseConfigured()) return null;
      const created = await discussionsService.insertThread({
        title,
        question,
        authorName,
        authorId,
      });
      if (!created) return null;

      setModerationDiscussions((prev) => [created, ...prev]);
      if (created.moderationStatus === "Approved") {
        setDiscussions((prev) => [created, ...prev]);
      }
      return created;
    },
    []
  );

  const setDiscussionModeration = useCallback(
    async (
      threadId: string,
      patch: {
        moderationStatus?: Discussion["moderationStatus"];
        visibility?: Discussion["visibility"];
      }
    ) => {
      if (!isSupabaseConfigured()) return false;
      const ok = await discussionsService.updateThreadModeration(threadId, patch);
      if (!ok) return false;

      const applyPatch = (d: Discussion): Discussion | null => {
        if (d.id !== threadId) return d;
        const next = {
          ...d,
          moderationStatus: patch.moderationStatus ?? d.moderationStatus,
          visibility: patch.visibility ?? d.visibility,
        };
        if (next.moderationStatus === "Removed") return null;
        return next;
      };

      setModerationDiscussions((prev) =>
        prev.map(applyPatch).filter((d): d is Discussion => d !== null)
      );

      const [publicThreads, modThreads] = await Promise.all([
        discussionsService.fetchDiscussions(),
        discussionsService.fetchDiscussions({ forModeration: true }),
      ]);
      setDiscussions(publicThreads);
      setModerationDiscussions(modThreads);
      return true;
    },
    []
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setDataLoading(false);
      setPractitionersLoading(false);
      setDiscussionsLoading(false);
      return;
    }
    if (authConfigured && authLoading) return;
    refreshContent();
  }, [refreshContent, authConfigured, authLoading, session?.user?.id]);

  const storeCategories = useMemo(
    () => groupProductsIntoCategories(allProducts),
    [allProducts]
  );

  const sellerCatalog = useMemo(
    () => sellerCatalogProducts.map(toSellerProduct),
    [sellerCatalogProducts]
  );

  const addEvent = useCallback(
    async (event: Omit<CommunityEvent, "id" | "dbId">): Promise<boolean> => {
      if (!isSupabaseConfigured()) return false;
      const created = await eventsService.insertEvent({
        ...event,
        id: generateId("evt"),
      } as CommunityEvent);
      if (!created) return false;
      setEvents((prev) => [...prev, created]);
      return true;
    },
    []
  );

  const updateEvent = useCallback(async (id: string, patch: eventsService.EventUpdatePatch): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    const target = events.find((e) => e.id === id);
    if (!target?.dbId) return false;
    const updated = await eventsService.updateEvent(target.dbId, patch);
    if (!updated) return false;
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return true;
  }, [events]);

  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    const target = events.find((e) => e.id === id);
    if (!target?.dbId) return false;
    const deleted = await eventsService.deleteEventByDbId(target.dbId);
    if (!deleted) return false;
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "Ended", isVisible: false } : e))
    );
    return true;
  }, [events]);

  const setEventVisibility = useCallback(
    async (id: string, visible: boolean): Promise<boolean> => {
      if (!isSupabaseConfigured()) return false;
      const target = events.find((e) => e.id === id);
      if (!target?.dbId) return false;
      const updated = await eventsService.updateEventVisibility(target.dbId, visible);
      if (!updated) return false;
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, isVisible: visible, status: visible ? "Active" : "Ended" } : e)));
      return true;
    },
    [events]
  );

  const addResource = useCallback(async (resource: Omit<ResourceItem, "id">): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    const created = await resourcesService.insertResource(resource);
    if (!created) return false;
    setResources((prev) => [...prev, created]);
    return true;
  }, []);

  const deleteResource = useCallback(async (id: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    const deleted = await resourcesService.deleteResource(id);
    if (!deleted) return false;
    setResources((prev) => prev.filter((r) => r.id !== id));
    return true;
  }, []);

  const setResourcePublished = useCallback(async (id: string, published: boolean): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    const updated = await resourcesService.setResourcePublished(id, published);
    if (!updated) return false;
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, published } : r)));
    return true;
  }, []);

  const updateResource = useCallback(
    async (id: string, patch: resourcesService.ResourceUpdatePatch): Promise<boolean> => {
      if (!isSupabaseConfigured()) return false;
      const updated = await resourcesService.updateResource(id, patch);
      if (!updated) return false;
      setResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return true;
    },
    []
  );

  const addProduct = useCallback(
    async (product: Omit<StoreProduct, "id"> & { id?: string }): Promise<StoreProduct | null> => {
      if (!isSupabaseConfigured()) return null;
      let sellerId: string | null = null;
      if (profile?.id && profile.role === "Seller") {
        sellerId = await resolveSellerIdByProfileId(profile.id);
        if (!sellerId) {
          console.error("[DataContext] addProduct: seller profile not provisioned");
          return null;
        }
      }
      const created = await productsService.insertProduct(
        { ...product, sellerId: sellerId ?? undefined },
        { autoApproveProducts: platformSettings.autoApproveProducts }
      );
      if (created) {
        setAllProducts((prev) => [...prev, created]);
        if (sellerId) {
          setSellerCatalogProducts((prev) => [...prev, created]);
        }
        return created;
      }
      return null;
    },
    [profile?.id, profile?.role, platformSettings.autoApproveProducts]
  );

  const updateProduct = useCallback(async (id: string, updates: Partial<StoreProduct>): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    const updated = await productsService.updateProduct(id, updates);
    if (!updated) return false;
    setAllProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    setSellerCatalogProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return true;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) return false;
    const deleted = await productsService.deleteProduct(id);
    if (!deleted) return false;
    setAllProducts((prev) => prev.filter((p) => p.id !== id));
    setSellerCatalogProducts((prev) => prev.filter((p) => p.id !== id));
    return true;
  }, []);

  const addPractitioner = useCallback(
    async (
      practitioner: Omit<
        Practitioner,
        "id" | "photo" | "localPhoto" | "reviewCount" | "availability"
      > & { id?: string; subcategory?: string; profileId?: string }
    ) => {
      if (!isSupabaseConfigured()) return;
      const created = await practitionersService.insertPractitioner(practitioner);
      if (created) {
        setPractitionerCats((prev) =>
          groupPractitionersIntoCategories(
            [...prev.flatMap((c) => c.practitioners), created],
            practitionerCategoryTemplates
          )
        );
      }
    },
    []
  );

  const togglePractitioner = useCallback(async (id: string, enabled: boolean) => {
    if (!enabled) {
      if (!isSupabaseConfigured()) return;
      await practitionersService.deletePractitioner(id);
      setPractitionerCats((prev) =>
        prev.map((cat) => ({
          ...cat,
          practitioners: cat.practitioners.filter((p) => p.id !== id),
        }))
      );
    }
  }, []);

  const deletePractitioner = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) return;
    await practitionersService.deletePractitioner(id);
    setPractitionerCats((prev) =>
      prev.map((cat) => ({
        ...cat,
        practitioners: cat.practitioners.filter((p) => p.id !== id),
      }))
    );
  }, []);

  const updatePractitionerMeta = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Practitioner, "approvalStatus" | "isVerified" | "featured">>
    ) => {
      if (!isSupabaseConfigured()) return;
      await practitionersService.updatePractitioner(id, {
        approval_status: patch.approvalStatus,
        is_verified: patch.isVerified,
        featured: patch.featured,
      });
      setPractitionerCats((prev) =>
        prev.map((cat) => ({
          ...cat,
          practitioners: cat.practitioners.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        }))
      );
    },
    []
  );

  const updatePractitionerBio = useCallback(async (id: string, bio: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || bio.trim().length > 600) return false;
    const ok = await practitionersService.updatePractitioner(id, { bio: bio.trim() });
    if (!ok) return false;
    setPractitionerCats((prev) => prev.map((cat) => ({
      ...cat,
      practitioners: cat.practitioners.map((p) => p.id === id ? { ...p, bio: bio.trim() } : p),
    })));
    return true;
  }, []);

  const updatePractitionerPrice = useCallback(async (id: string, price: number): Promise<boolean> => {
    if (!isSupabaseConfigured() || !Number.isFinite(price) || price < 0) return false;
    const ok = await practitionersService.updatePractitioner(id, { price_per_session: price });
    if (!ok) return false;
    setPractitionerCats((prev) => prev.map((cat) => ({
      ...cat,
      practitioners: cat.practitioners.map((p) => p.id === id ? { ...p, pricePerSession: price } : p),
    })));
    return true;
  }, []);

  const value: DataContextType = {
    dataLoading,
    dataError,
    isRemoteData,
    refreshContent,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    setEventVisibility,
    discussions,
    moderationDiscussions,
    discussionsLoading,
    discussionsError,
    addDiscussionReply,
    createDiscussion,
    setDiscussionModeration,
    resources,
    addResource,
    deleteResource,
    setResourcePublished,
    updateResource,
    allProducts,
    storeCategories,
    sellerCatalog,
    refreshSellerCatalog,
    addProduct,
    updateProduct,
    deleteProduct,
    practitionerCategories: practitionerCats,
    practitionersLoading,
    addPractitioner,
    togglePractitioner,
    deletePractitioner,
    updatePractitionerMeta,
    updatePractitionerBio,
    updatePractitionerPrice,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataContext must be used inside DataProvider");
  return ctx;
}
