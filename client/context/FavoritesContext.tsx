import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { AddFavoriteInput, FavoriteItem, FavoriteItemType } from "@/data/favorites";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import * as favoritesService from "@/services/favorites/favoritesService";

interface FavoritesContextType {
  favorites: FavoriteItem[];
  favoritesLoading: boolean;
  favoritesError: string | null;
  refreshFavorites: (options?: { silent?: boolean }) => Promise<void>;
  isFavorite: (itemType: FavoriteItemType, itemId: string) => boolean;
  addFavorite: (input: AddFavoriteInput) => Promise<FavoriteItem | null>;
  removeFavorite: (favoriteId: string) => Promise<boolean>;
  removeFavoriteByItem: (itemType: FavoriteItemType, itemId: string) => Promise<boolean>;
  toggleFavorite: (input: AddFavoriteInput) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(isSupabaseConfigured());
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  const refreshFavorites = useCallback(async (options?: { silent?: boolean }) => {
    if (!isSupabaseConfigured()) {
      setFavorites([]);
      setFavoritesLoading(false);
      setFavoritesError(null);
      return;
    }

    if (!session?.user) {
      setFavorites([]);
      setFavoritesLoading(false);
      setFavoritesError(null);
      return;
    }

    if (!options?.silent) {
      setFavoritesLoading(true);
    }
    setFavoritesError(null);
    try {
      const rows = await favoritesService.fetchMyFavorites();
      setFavorites(rows);
    } catch (err) {
      setFavoritesError(
        err instanceof Error ? err.message : "Could not load favorites"
      );
      setFavorites([]);
    } finally {
      if (!options?.silent) {
        setFavoritesLoading(false);
      }
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      refreshFavorites();
      return;
    }
    if (authConfigured && authLoading) return;
    refreshFavorites();
  }, [refreshFavorites, authConfigured, authLoading, session?.user?.id]);

  const favoriteKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const f of favorites) {
      set.add(`${f.itemType}:${f.itemId}`);
    }
    return set;
  }, [favorites]);

  const isFavorite = useCallback(
    (itemType: FavoriteItemType, itemId: string) =>
      favoriteKeySet.has(`${itemType}:${itemId}`),
    [favoriteKeySet]
  );

  const addFavorite = useCallback(
    async (input: AddFavoriteInput) => {
      if (!isSupabaseConfigured() || !session?.user) return null;
      const created = await favoritesService.addFavorite(input);
      if (created) {
        setFavorites((prev) => {
          const without = prev.filter(
            (f) => !(f.itemType === created.itemType && f.itemId === created.itemId)
          );
          return [created, ...without];
        });
      }
      return created;
    },
    [session?.user]
  );

  const removeFavorite = useCallback(async (favoriteId: string) => {
    if (!isSupabaseConfigured()) return false;
    const ok = await favoritesService.removeFavorite(favoriteId);
    if (ok) {
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
    }
    return ok;
  }, []);

  const removeFavoriteByItem = useCallback(
    async (itemType: FavoriteItemType, itemId: string) => {
      if (!isSupabaseConfigured()) return false;
      const ok = await favoritesService.removeFavoriteByItem(itemType, itemId);
      if (ok) {
        setFavorites((prev) =>
          prev.filter((f) => !(f.itemType === itemType && f.itemId === itemId))
        );
      }
      return ok;
    },
    []
  );

  const toggleFavorite = useCallback(
    async (input: AddFavoriteInput) => {
      if (isFavorite(input.itemType, input.itemId)) {
        return removeFavoriteByItem(input.itemType, input.itemId);
      }
      const created = await addFavorite(input);
      return Boolean(created);
    },
    [isFavorite, addFavorite, removeFavoriteByItem]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoritesLoading,
        favoritesError,
        refreshFavorites,
        isFavorite,
        addFavorite,
        removeFavorite,
        removeFavoriteByItem,
        toggleFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
