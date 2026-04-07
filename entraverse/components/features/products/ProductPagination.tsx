"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useProductsContext } from "@/hooks/useProducts";
import { useProductFilters } from "@/hooks/useProductFilters";
import { cn } from "@/lib/utils";

type PaginationToken = number | "left-ellipsis" | "right-ellipsis";

const buildPaginationTokens = (currentPage: number, totalPages: number): PaginationToken[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const tokens: PaginationToken[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    tokens.push("left-ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    tokens.push(page);
  }

  if (end < totalPages - 1) {
    tokens.push("right-ellipsis");
  }

  tokens.push(totalPages);
  return tokens;
};

export const ProductPagination = () => {
  const { meta, loading } = useProductsContext();
  const { updateFilters } = useProductFilters();

  if (!meta || loading || meta.last_page <= 1) {
    return null;
  }

  const currentPage = meta.current_page;
  const totalPages = meta.last_page;
  const tokens = buildPaginationTokens(currentPage, totalPages);

  const handlePageChange = (page: number) => {
    if (page === currentPage) return;
    updateFilters({ page }, { resetPage: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {tokens.map((token, index) => {
        if (typeof token !== "number") {
          return (
            <span
              key={`${token}-${index}`}
              className="inline-flex h-10 w-10 items-center justify-center text-slate-400"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          );
        }

        const isActive = token === currentPage;
        return (
          <button
            key={token}
            type="button"
            onClick={() => handlePageChange(token)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition",
              isActive
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {token}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Halaman berikutnya"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
};
