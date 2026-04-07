"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { productsApi } from "@/lib/api/products";
import type { WishlistProductSnapshot } from "@/lib/wishlist";

const WISHLIST_STORAGE_KEY = "entraverse_wishlist_ids";
const WISHLIST_ITEMS_STORAGE_KEY = "entraverse_wishlist_items";

type WishlistState = {
  ids: string[];
  items: WishlistProductSnapshot[];
};

const wishlistSubscribers = new Set<(state: WishlistState) => void>();
let wishlistCache: WishlistState | null = null;

const toUniqueIds = (ids: string[]): string[] => {
  return Array.from(new Set(ids.filter((id) => id.trim().length > 0)));
};

const toUniqueItems = (items: WishlistProductSnapshot[]): WishlistProductSnapshot[] => {
  const itemsById = new Map<string, WishlistProductSnapshot>();

  items.forEach((item) => {
    const id = item.id.trim();
    if (!id) return;

    itemsById.set(id, {
      ...item,
      id,
      image: item.image?.trim() ? item.image : "/assets/images/hero/e-hero.png",
      updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
    });
  });

  return Array.from(itemsById.values()).sort((left, right) => right.updatedAt - left.updatedAt);
};

const readWishlistState = (): WishlistState => {
  if (typeof window === "undefined") return { ids: [], items: [] };
  if (wishlistCache) return wishlistCache;

  try {
    const rawIds = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    const rawItems = window.localStorage.getItem(WISHLIST_ITEMS_STORAGE_KEY);

    const parsedIds = rawIds ? JSON.parse(rawIds) : [];
    const parsedItems = rawItems ? JSON.parse(rawItems) : [];

    const ids = Array.isArray(parsedIds)
      ? toUniqueIds(parsedIds.map((value) => String(value)))
      : [];
    const items = Array.isArray(parsedItems)
      ? toUniqueItems(parsedItems as WishlistProductSnapshot[])
      : [];

    wishlistCache = {
      ids: toUniqueIds([...ids, ...items.map((item) => item.id)]),
      items,
    };

    return wishlistCache;
  } catch {
    wishlistCache = { ids: [], items: [] };
    return wishlistCache;
  }
};

const writeWishlistState = (nextState: WishlistState) => {
  const normalizedState = {
    ids: toUniqueIds(nextState.ids),
    items: toUniqueItems(nextState.items).filter((item) => nextState.ids.includes(item.id)),
  } satisfies WishlistState;

  wishlistCache = normalizedState;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(normalizedState.ids));
    window.localStorage.setItem(WISHLIST_ITEMS_STORAGE_KEY, JSON.stringify(normalizedState.items));
  }

  wishlistSubscribers.forEach((subscriber) => subscriber(normalizedState));
};

const upsertWishlistItem = (
  items: WishlistProductSnapshot[],
  snapshot: WishlistProductSnapshot
): WishlistProductSnapshot[] => {
  return toUniqueItems([
    ...items.filter((item) => item.id !== snapshot.id),
    {
      ...snapshot,
      updatedAt: Date.now(),
    },
  ]);
};

const removeWishlistItem = (items: WishlistProductSnapshot[], productId: string) => {
  return items.filter((item) => item.id !== productId);
};

export const useWishlist = () => {
  const [wishlistState, setWishlistState] = useState<WishlistState>(() => readWishlistState());
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const subscriber = (state: WishlistState) => {
      setWishlistState(state);
    };

    wishlistSubscribers.add(subscriber);
    setWishlistState(readWishlistState());
    setHasHydrated(true);

    return () => {
      wishlistSubscribers.delete(subscriber);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== WISHLIST_STORAGE_KEY && event.key !== WISHLIST_ITEMS_STORAGE_KEY) return;
      setWishlistState(readWishlistState());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const toggleWishlist = useCallback(async (productId: string, snapshot?: WishlistProductSnapshot) => {
    if (!productId) return;

    setLoadingIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));

    const previous = readWishlistState();
    const nextIsWishlisted = !previous.ids.includes(productId);
    const optimisticState = {
      ids: nextIsWishlisted
        ? toUniqueIds([...previous.ids, productId])
        : previous.ids.filter((id) => id !== productId),
      items: nextIsWishlisted
        ? snapshot
          ? upsertWishlistItem(previous.items, snapshot)
          : previous.items
        : removeWishlistItem(previous.items, productId),
    } satisfies WishlistState;

    writeWishlistState(optimisticState);

    try {
      const response = await productsApi.toggleWishlist(productId, nextIsWishlisted);

      if (!response.success) {
        writeWishlistState(previous);
        return;
      }

      const syncedState = {
        ids: response.is_wishlisted
          ? toUniqueIds([...previous.ids.filter((id) => id !== productId), productId])
          : previous.ids.filter((id) => id !== productId),
        items: response.is_wishlisted
          ? snapshot
            ? upsertWishlistItem(optimisticState.items, snapshot)
            : optimisticState.items
          : removeWishlistItem(optimisticState.items, productId),
      } satisfies WishlistState;

      writeWishlistState(syncedState);
    } catch (error) {
      console.error("Failed to toggle wishlist:", error);
      writeWishlistState(previous);
    } finally {
      setLoadingIds((prev) => prev.filter((id) => id !== productId));
    }
  }, []);

  const seedWishlistItem = useCallback((snapshot: WishlistProductSnapshot) => {
    const current = readWishlistState();
    if (current.ids.includes(snapshot.id)) return;

    writeWishlistState({
      ids: toUniqueIds([...current.ids, snapshot.id]),
      items: upsertWishlistItem(current.items, snapshot),
    });
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => {
      return wishlistState.ids.includes(productId);
    },
    [wishlistState.ids]
  );

  const isPending = useCallback(
    (productId: string) => {
      return loadingIds.includes(productId);
    },
    [loadingIds]
  );

  const loading = useMemo(() => loadingIds.length > 0, [loadingIds]);

  return {
    wishlistIds: wishlistState.ids,
    wishlistItems: wishlistState.items,
    toggleWishlist,
    seedWishlistItem,
    isInWishlist,
    isPending,
    loading,
    hasHydrated,
  };
};
