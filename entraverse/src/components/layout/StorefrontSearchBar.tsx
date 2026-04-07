"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Clock3, Loader2, Search, Sparkles } from "lucide-react";
import { AddressShortcut } from "@/src/components/layout/AddressShortcut";
import { useDebounce } from "@/src/hooks/useDebounce";
import { productsApi } from "@/lib/api/products";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product.types";

interface StorefrontSearchBarProps {
  compact?: boolean;
  variant?: "default" | "overlay";
}

const SEARCH_HISTORY_KEY = "entraverse:storefront-search-history";
const MIN_SEARCH_LENGTH = 2;
const MAX_HISTORY_ITEMS = 6;

const readHistory = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0)
      .slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
};

const writeHistory = (value: string): string[] => {
  const trimmed = value.trim();
  if (!trimmed || typeof window === "undefined") {
    return readHistory();
  }

  const nextHistory = [
    trimmed,
    ...readHistory().filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_HISTORY_ITEMS);

  window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
  return nextHistory;
};

export function StorefrontSearchBar({
  compact = false,
  variant = "default",
}: StorefrontSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const routeQuery = pathname === "/products" ? searchParams.get("search") ?? "" : "";

  const [query, setQuery] = useState(routeQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>(() => readHistory());

  const debouncedQuery = useDebounce(query, 400);
  const trimmedQuery = query.trim();
  const trimmedDebouncedQuery = debouncedQuery.trim();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    let active = true;

    if (!open || trimmedDebouncedQuery.length < MIN_SEARCH_LENGTH) {
      return () => {
        active = false;
      };
    }

    void productsApi
      .getSearchSuggestions(trimmedDebouncedQuery, 6)
      .then((response) => {
        if (!active) return;
        setProducts(response.data);
        setKeywords(response.meta.keywords);
      })
      .catch((error) => {
        if (!active) return;
        console.error(error);
        setProducts([]);
        setKeywords([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, trimmedDebouncedQuery]);

  const submitSearch = useCallback((value: string) => {
    const nextQuery = value.trim();
    if (!nextQuery) {
      router.push("/products");
      setOpen(false);
      return;
    }

    const nextHistory = writeHistory(nextQuery);
    setHistory(nextHistory);
    setOpen(false);
    router.push(`/products?search=${encodeURIComponent(nextQuery)}`);
  }, [router]);

  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch(query);
  }, [query, submitSearch]);

  const hasSuggestions = products.length > 0 || keywords.length > 0;
  const showHistory = trimmedQuery.length < MIN_SEARCH_LENGTH;
  const recentHistory = useMemo(
    () => history.filter((item) => item.toLowerCase() !== trimmedQuery.toLowerCase()),
    [history, trimmedQuery]
  );
  const isOverlay = variant === "overlay";

  return (
    <div ref={wrapperRef} className="relative min-w-0 flex-1">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex items-center gap-2 rounded-full px-3 transition-[background-color,border-color,color,box-shadow] duration-300",
          isOverlay
            ? "border border-white/15 bg-white/[0.08] text-white shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl focus-within:border-white/35 focus-within:bg-white/[0.14]"
            : "border border-slate-200/80 bg-white text-slate-600 focus-within:border-blue-300",
          compact ? "h-10" : "h-11"
        )}
        role="search"
      >
        <AddressShortcut mode="pill" compact={compact} variant={variant} />
        <span className={cn("w-px", isOverlay ? "bg-white/15" : "bg-slate-200", compact ? "h-4" : "h-5")} aria-hidden />
        <Search
          className={cn("h-4 w-4 shrink-0 transition-colors duration-300", isOverlay ? "text-white/80" : "text-slate-500")}
          strokeWidth={1.6}
        />
        <input
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            setLoading(nextValue.trim().length >= MIN_SEARCH_LENGTH);
          }}
          onFocus={() => {
            setQuery((current) => (
              routeQuery.trim().length > 0 && current !== routeQuery ? routeQuery : current
            ));
            setLoading((routeQuery.trim().length > 0 ? routeQuery : query).trim().length >= MIN_SEARCH_LENGTH);
            setOpen(true);
          }}
          aria-label="Cari produk"
          className={cn(
            "w-full bg-transparent text-sm outline-none transition-colors duration-300",
            isOverlay ? "text-white placeholder:text-white/65" : "text-slate-700 placeholder:text-slate-400"
          )}
          placeholder="Cari produk di Entraverse"
        />
        {loading ? (
          <Loader2 className={cn("h-4 w-4 animate-spin", isOverlay ? "text-white" : "text-blue-600")} />
        ) : null}
        <button type="submit" className="sr-only">
          Cari
        </button>
      </form>

      {open ? (
        <div
          id={compact ? "storefront-search-mobile-panel" : "storefront-search-panel"}
          className="absolute inset-x-0 top-[calc(100%+0.75rem)] z-50 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_22px_55px_-28px_rgba(15,23,42,0.42)]"
        >
          {showHistory ? (
            <div className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock3 className="h-4 w-4 text-slate-400" />
                Pencarian Terakhir
              </div>

              {recentHistory.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentHistory.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => submitSearch(item)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Ketik minimal 2 karakter untuk mulai mencari produk.</p>
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center gap-3 px-4 py-5 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              Mencari produk yang paling relevan...
            </div>
          ) : hasSuggestions ? (
            <div className="max-h-[26rem] overflow-y-auto p-2">
              {products.length > 0 ? (
                <div className="space-y-1">
                  {products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      onClick={() => {
                        setHistory(writeHistory(trimmedQuery));
                        setOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-slate-50"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <Image src={product.image} alt={product.name} fill className="object-cover" unoptimized />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {product.brand.name} • {product.category.name}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}

              {keywords.length > 0 ? (
                <div className={cn("px-3 pb-3", products.length > 0 && "pt-3")}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Kata Kunci Terkait
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => submitSearch(keyword)}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-semibold text-slate-700">Produk tidak ditemukan</p>
              <p className="mt-1 text-sm text-slate-500">Coba gunakan kata kunci lain atau nama brand yang lebih spesifik.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
