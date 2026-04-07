"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cartApi, type CartApiItem } from "@/lib/api/cart";
import type { AddToCartMetadata, CartActionResult, CartItem, CartSummary, CartVariantMap } from "@/types/cart.types";

const CART_STORAGE_KEY = "entraverse_cart_items";
const CART_FALLBACK_IMAGE = "/assets/images/hero/e-hero.png";

const cartSubscribers = new Set<(items: CartItem[]) => void>();
let cartCache: CartItem[] | null = null;
let hasBootstrappedFromApi = false;

const normalizeVariantMap = (value: CartVariantMap | undefined): CartVariantMap => {
  if (!value) return {};

  return Object.entries(value).reduce<CartVariantMap>((result, [name, option]) => {
    const normalizedName = String(name ?? "").trim();
    const normalizedOption = String(option ?? "").trim();
    if (!normalizedName || !normalizedOption) return result;

    result[normalizedName] = normalizedOption;
    return result;
  }, {});
};

const buildVariantKey = (variants: CartVariantMap): string => {
  return Object.entries(variants)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, option]) => `${name}:${option}`)
    .join("|");
};

const buildTradeInLineKey = (
  tradeInTransactionId?: string,
  tradeInEnabled?: boolean
): string => {
  const normalizedTransactionId = String(tradeInTransactionId ?? "").trim();
  if (normalizedTransactionId) {
    return `trade-in:${normalizedTransactionId}`;
  }

  return tradeInEnabled ? "trade-in:pending" : "standard";
};

const normalizeCartItem = (raw: unknown): CartItem | null => {
  if (!raw || typeof raw !== "object") return null;

  const row = raw as Record<string, unknown>;
  const productId = String(row.productId ?? row.product_id ?? row.id ?? "").trim();
  const name = String(row.name ?? "").trim();
  const price = Number(row.price ?? 0);
  const displayPrice = Number(row.displayPrice ?? row.display_price ?? row.entraverse_price ?? row.price ?? 0);
  const variantSku = String(row.variantSku ?? row.variant_sku ?? "").trim();
  const quantity = Math.max(1, Math.floor(Number(row.quantity ?? row.qty ?? 1)));
  const stock = Math.max(1, Math.floor(Number(row.stock ?? Number.MAX_SAFE_INTEGER)));
  const minOrder = Math.max(1, Math.floor(Number(row.minOrder ?? row.min_order ?? 1)));
  const variants = normalizeVariantMap(row.variants as CartVariantMap);
  const tradeInEnabled = Boolean(row.tradeInEnabled ?? row.trade_in_enabled ?? false);
  const tradeInValue = Math.max(0, Number(row.tradeInValue ?? row.trade_in_value ?? 0));
  const tradeInUnitValue = Math.max(0, Number(row.tradeInUnitValue ?? row.trade_in_unit_value ?? 0));
  const tradeInTransactionId = String(
    row.tradeInTransactionId ?? row.trade_in_transaction_id ?? ""
  ).trim();
  const tradeInTransactionNumber = String(
    row.tradeInTransactionNumber ?? row.trade_in_transaction_number ?? ""
  ).trim();
  const selected = row.selected === undefined ? true : Boolean(row.selected);
  const hasTradeInFlow = tradeInEnabled || tradeInTransactionId.length > 0;
  const lineKey = buildTradeInLineKey(tradeInTransactionId, hasTradeInFlow);
  const id = String(
    row.id ??
      `${productId}:${buildVariantKey(normalizeVariantMap(row.variants as CartVariantMap)) || "default"}:${lineKey}`
  ).trim();

  if (!id || !productId || !name || !Number.isFinite(price) || price < 0) return null;

  return {
    id,
    productId,
    name,
    slug: typeof row.slug === "string" ? row.slug : undefined,
    image: typeof row.image === "string" && row.image.trim().length > 0 ? row.image : CART_FALLBACK_IMAGE,
    price,
    displayPrice: Number.isFinite(displayPrice) && displayPrice >= 0 ? displayPrice : price,
    variantSku: variantSku || undefined,
    quantity,
    stock,
    minOrder,
    selected,
    variants,
    tradeInEnabled: hasTradeInFlow,
    tradeInValue,
    tradeInUnitValue,
    tradeInTransactionId: tradeInTransactionId || undefined,
    tradeInTransactionNumber: tradeInTransactionNumber || undefined,
  };
};

const mapCartApiItem = (item: CartApiItem): CartItem => {
  return {
    id: item.id,
    productId: item.productId,
    name: item.name,
    slug: item.slug,
    image: item.image || CART_FALLBACK_IMAGE,
    price: Math.max(0, item.price),
    displayPrice: Math.max(0, item.displayPrice ?? item.price),
    variantSku: item.variantSku,
    quantity: Math.max(1, Math.floor(item.quantity)),
    stock: Math.max(1, Math.floor(item.stock)),
    minOrder: Math.max(1, Math.floor(item.minOrder)),
    selected: item.selected,
    variants: normalizeVariantMap(item.variants),
    tradeInEnabled: item.tradeInEnabled || Boolean(item.tradeInTransactionId),
    tradeInValue: Math.max(0, item.tradeInValue),
    tradeInUnitValue: Math.max(0, item.tradeInUnitValue),
    tradeInTransactionId: item.tradeInTransactionId,
    tradeInTransactionNumber: item.tradeInTransactionNumber,
  };
};

const mergeClientTradeInMetadata = (items: CartItem[], previousItems: CartItem[]): CartItem[] => {
  return items.map((item) => {
    const previous =
      previousItems.find((candidate) => candidate.id === item.id) ??
      previousItems.find((candidate) =>
        matchSameLine(candidate, item.productId, item.variants, {
          tradeInTransactionId: item.tradeInTransactionId,
          tradeInEnabled: item.tradeInEnabled,
        })
      );

    if (!previous) {
      return item;
    }

    return {
      ...item,
      tradeInTransactionId: item.tradeInTransactionId ?? previous.tradeInTransactionId,
      tradeInTransactionNumber: item.tradeInTransactionNumber ?? previous.tradeInTransactionNumber,
    };
  });
};

const parseStorageItems = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  if (cartCache) return cartCache;

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      cartCache = [];
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      cartCache = [];
      return [];
    }

    const normalized = parsed
      .map(normalizeCartItem)
      .filter((item): item is CartItem => item !== null);

    cartCache = normalized;
    return normalized;
  } catch {
    cartCache = [];
    return [];
  }
};

const broadcastItems = (items: CartItem[]) => {
  cartSubscribers.forEach((subscriber) => subscriber(items));
};

const writeItems = (items: CartItem[]) => {
  cartCache = items;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }

  broadcastItems(items);
};

const matchSameLine = (
  item: CartItem,
  productId: string,
  variants: CartVariantMap,
  options?: { tradeInTransactionId?: string; tradeInEnabled?: boolean }
): boolean => {
  return (
    item.productId === productId &&
    buildVariantKey(item.variants) === buildVariantKey(variants) &&
    buildTradeInLineKey(item.tradeInTransactionId, item.tradeInEnabled) ===
      buildTradeInLineKey(options?.tradeInTransactionId, options?.tradeInEnabled)
  );
};

const clampQuantityByStock = (quantity: number, stock: number, minOrder: number): number => {
  const boundedByMin = Math.max(minOrder, Math.floor(quantity));
  return Math.min(stock, boundedByMin);
};

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingItemIds, setPendingItemIds] = useState<string[]>([]);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    const subscriber = (nextItems: CartItem[]) => {
      setItems(nextItems);
    };

    cartSubscribers.add(subscriber);
    return () => {
      cartSubscribers.delete(subscriber);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== CART_STORAGE_KEY) return;
      cartCache = null;
      setItems(parseStorageItems());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setItems(parseStorageItems());
  }, []);

  const isPending = useCallback((itemId: string) => {
    return pendingItemIds.includes(itemId);
  }, [pendingItemIds]);

  const refreshCart = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    const previousItems = parseStorageItems();
    const response = await cartApi.getCart();
    if (response.success && !response.localOnly) {
      writeItems(mergeClientTradeInMetadata(response.items.map(mapCartApiItem), previousItems));
    }

    if (!response.success && !silent) {
      setError(response.message ?? "Gagal memuat keranjang.");
    }

    if (!silent) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current || hasBootstrappedFromApi) return;
    bootstrappedRef.current = true;
    hasBootstrappedFromApi = true;

    void refreshCart({ silent: true });
  }, [refreshCart]);

  const addToCart = useCallback(async (
    productId: string,
    quantity: number,
    variant?: CartVariantMap,
    metadata?: AddToCartMetadata
  ): Promise<CartActionResult> => {
    const safeProductId = productId.trim();
    const requestedQuantity = Math.max(1, Math.floor(quantity));
    if (!safeProductId) {
      return { success: false, message: "Produk tidak valid." };
    }

    const normalizedVariant = normalizeVariantMap(variant);
    const variantKey = buildVariantKey(normalizedVariant) || "default";
    const previousItems = parseStorageItems();
    const requestedTradeInTransactionId = metadata?.tradeInTransactionId?.trim();
    const requestedTradeInEnabled = Boolean(metadata?.tradeInEnabled ?? requestedTradeInTransactionId);
    const existing = previousItems.find((item) =>
      matchSameLine(item, safeProductId, normalizedVariant, {
        tradeInTransactionId: requestedTradeInTransactionId,
        tradeInEnabled: requestedTradeInEnabled,
      })
    );
    const stock = Math.max(1, Math.floor(metadata?.stock ?? existing?.stock ?? Number.MAX_SAFE_INTEGER));
    const minOrder = Math.max(1, Math.floor(metadata?.minOrder ?? existing?.minOrder ?? 1));
    const tradeInTransactionId = requestedTradeInTransactionId || existing?.tradeInTransactionId;
    const tradeInTransactionNumber = metadata?.tradeInTransactionNumber?.trim() || existing?.tradeInTransactionNumber;
    const tradeInEnabled = Boolean((metadata?.tradeInEnabled ?? existing?.tradeInEnabled ?? false) || tradeInTransactionId);
    const lineKey = buildTradeInLineKey(tradeInTransactionId, tradeInEnabled);

    const targetQuantity = clampQuantityByStock(
      (existing?.quantity ?? 0) + requestedQuantity,
      stock,
      minOrder
    );

    if (existing && targetQuantity === existing.quantity) {
      setError(`Stok tersisa ${stock} item.`);
      return { success: false, message: `Stok tersisa ${stock} item.` };
    }

    const optimisticItem: CartItem = {
      id: existing?.id ?? `local:${safeProductId}:${variantKey}:${lineKey}`,
      productId: safeProductId,
      name: metadata?.name?.trim() || existing?.name || "Produk",
      slug: metadata?.slug || existing?.slug,
      image: metadata?.image || existing?.image || CART_FALLBACK_IMAGE,
      price: Math.max(0, Number(metadata?.price ?? existing?.price ?? 0)),
      displayPrice: Math.max(0, Number(metadata?.displayPrice ?? existing?.displayPrice ?? metadata?.price ?? existing?.price ?? 0)),
      variantSku: metadata?.variantSku?.trim() || existing?.variantSku,
      quantity: targetQuantity,
      stock,
      minOrder,
      selected: existing?.selected ?? true,
      variants: normalizedVariant,
      tradeInEnabled,
      tradeInValue: Math.max(
        0,
        Number(metadata?.tradeInValue ?? existing?.tradeInValue ?? 0)
      ),
      tradeInUnitValue: Math.max(
        0,
        Number(metadata?.tradeInUnitValue ?? existing?.tradeInUnitValue ?? 0)
      ),
      tradeInTransactionId,
      tradeInTransactionNumber,
    };

    const optimisticItems = existing
      ? previousItems.map((item) => (item.id === existing.id ? optimisticItem : item))
      : [optimisticItem, ...previousItems];

    try {
      setLoading(true);
      setError(null);
      writeItems(optimisticItems);
      setPendingItemIds((prev) => Array.from(new Set([...prev, optimisticItem.id])));

      const response = await cartApi.addItem(safeProductId, requestedQuantity, normalizedVariant);
      if (response.success === false) {
        const message = response.message ?? "Gagal menambahkan produk ke keranjang.";
        writeItems(previousItems);
        setError(message);
        return { success: false as const, message };
      }

      if (!response.localOnly && response.items.length > 0) {
        writeItems(mergeClientTradeInMetadata(response.items.map(mapCartApiItem), optimisticItems));
      }

      return { success: true as const, message: response.message ?? "Produk masuk ke keranjang." };
    } catch (fetchError) {
      console.error(fetchError);
      const message = "Gagal menambahkan produk ke keranjang.";
      writeItems(previousItems);
      setError(message);
      return { success: false as const, message };
    } finally {
      setPendingItemIds((prev) => prev.filter((itemId) => itemId !== optimisticItem.id));
      setLoading(false);
    }
  }, []);

  const updateItemQuantity = useCallback(async (itemId: string, quantity: number): Promise<CartActionResult> => {
    const previousItems = parseStorageItems();
    const targetItem = previousItems.find((item) => item.id === itemId);
    if (!targetItem) return { success: false, message: "Item tidak ditemukan." };

    const clampedQuantity = clampQuantityByStock(
      quantity,
      targetItem.stock,
      targetItem.minOrder
    );

    if (clampedQuantity !== quantity) {
      setError(`Stok tersisa ${targetItem.stock} item.`);
    }

    if (targetItem.quantity === clampedQuantity) {
      return { success: true };
    }

    const optimisticItems = previousItems.map((item) => {
      if (item.id !== itemId) return item;

      const nextTradeInValue =
        item.tradeInUnitValue > 0
          ? item.tradeInUnitValue * clampedQuantity
          : item.quantity > 0
            ? (item.tradeInValue / item.quantity) * clampedQuantity
            : item.tradeInValue;

      return {
        ...item,
        quantity: clampedQuantity,
        tradeInValue: Math.max(0, nextTradeInValue),
      };
    });

    writeItems(optimisticItems);
    setPendingItemIds((prev) => Array.from(new Set([...prev, itemId])));
    setError(null);

    const response = await cartApi.updateItemQuantity(itemId, clampedQuantity, targetItem.productId);
    if (!response.success) {
      writeItems(previousItems);
      const message = response.message ?? "Gagal memperbarui jumlah item.";
      setError(message);
      setPendingItemIds((prev) => prev.filter((current) => current !== itemId));
      return { success: false, message };
    }

    if (!response.localOnly && response.items.length > 0) {
      writeItems(mergeClientTradeInMetadata(response.items.map(mapCartApiItem), optimisticItems));
    }

    setPendingItemIds((prev) => prev.filter((current) => current !== itemId));
    return { success: true, message: response.message };
  }, []);

  const removeItem = useCallback(async (itemId: string): Promise<CartActionResult> => {
    const previousItems = parseStorageItems();
    const targetItem = previousItems.find((item) => item.id === itemId);
    if (!targetItem) return { success: false, message: "Item tidak ditemukan." };

    const optimisticItems = previousItems.filter((item) => item.id !== itemId);
    writeItems(optimisticItems);
    setPendingItemIds((prev) => Array.from(new Set([...prev, itemId])));
    setError(null);

    const response = await cartApi.removeItem(itemId, targetItem.productId);
    if (!response.success) {
      writeItems(previousItems);
      const message = response.message ?? "Gagal menghapus item keranjang.";
      setError(message);
      setPendingItemIds((prev) => prev.filter((current) => current !== itemId));
      return { success: false, message };
    }

    if (!response.localOnly && response.items.length > 0) {
      writeItems(mergeClientTradeInMetadata(response.items.map(mapCartApiItem), optimisticItems));
    }

    setPendingItemIds((prev) => prev.filter((current) => current !== itemId));
    return { success: true, message: response.message };
  }, []);

  const toggleItemSelection = useCallback((itemId: string, nextSelected?: boolean) => {
    const previousItems = parseStorageItems();
    const nextItems = previousItems.map((item) => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        selected: typeof nextSelected === "boolean" ? nextSelected : !item.selected,
      };
    });

    writeItems(nextItems);
  }, []);

  const toggleSelectAll = useCallback((nextSelected?: boolean) => {
    const previousItems = parseStorageItems();
    if (previousItems.length === 0) return;

    const shouldSelectAll =
      typeof nextSelected === "boolean"
        ? nextSelected
        : previousItems.some((item) => !item.selected);

    const nextItems = previousItems.map((item) => ({
      ...item,
      selected: shouldSelectAll,
    }));

    writeItems(nextItems);
  }, []);

  const consumeItems = useCallback((itemIds: string[]) => {
    if (itemIds.length === 0) return;

    const targetIds = new Set(
      itemIds
        .map((itemId) => String(itemId ?? "").trim())
        .filter((itemId) => itemId.length > 0)
    );

    if (targetIds.size === 0) return;

    const previousItems = parseStorageItems();
    const nextItems = previousItems.filter((item) => !targetIds.has(item.id));

    if (nextItems.length === previousItems.length) return;

    writeItems(nextItems);
  }, []);

  const summary = useMemo<CartSummary>(() => {
    const selectedItems = items.filter((item) => item.selected);
    const totalPrice = selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tradeInDiscount = selectedItems.reduce((total, item) => total + item.tradeInValue, 0);
    const selectedLineCount = selectedItems.length;
    const selectedQuantity = selectedItems.reduce((total, item) => total + item.quantity, 0);

    return {
      totalPrice,
      tradeInDiscount,
      totalPayable: Math.max(0, totalPrice - tradeInDiscount),
      selectedLineCount,
      selectedQuantity,
    };
  }, [items]);

  const cartCount = useMemo(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const allSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((item) => item.selected);
  }, [items]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    items,
    cartCount,
    allSelected,
    pendingItemIds,
    summary,
    addToCart,
    updateItemQuantity,
    removeItem,
    consumeItems,
    toggleItemSelection,
    toggleSelectAll,
    refreshCart,
    isPending,
    clearError,
    loading,
    error,
  };
};
