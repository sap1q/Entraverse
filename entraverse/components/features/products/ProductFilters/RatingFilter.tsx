"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Star } from "lucide-react";
import { useProductFilters } from "@/hooks/useProductFilters";
import { cn } from "@/lib/utils";
import { RATING_OPTIONS } from "@/lib/constants/filters";

export const RatingFilter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { getFilterValue, updateFilters } = useProductFilters();
  const activeRating = getFilterValue("rating");

  const ratingOptions = useMemo(() => RATING_OPTIONS.slice().sort((left, right) => right - left), []);

  const handleSelectRating = (rating: number) => {
    const nextValue = activeRating === String(rating) ? undefined : [String(rating)];
    updateFilters({ rating: nextValue });
  };

  return (
    <section className="border-b border-slate-200 pb-5">
      <button
        type="button"
        onClick={() => setIsOpen((state) => !state)}
        className="flex w-full items-center justify-between text-slate-800 hover:text-slate-600"
      >
        <span className="text-sm font-semibold tracking-wide">RATING</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "")} />
      </button>

      {isOpen ? (
        <div className="mt-4 space-y-2.5">
          {ratingOptions.map((rating) => {
            const isActive = activeRating === String(rating);

            return (
              <button
                key={rating}
                type="button"
                onClick={() => handleSelectRating(rating)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition",
                  isActive
                    ? "border-blue-200 bg-blue-50 shadow-[0_10px_24px_-18px_rgba(37,99,235,0.45)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={`${rating}-${index}`}
                        className={cn(
                          "h-4 w-4",
                          index < rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
                        )}
                      />
                    ))}
                  </div>
                  <span className={cn("text-sm font-medium", isActive ? "text-blue-700" : "text-slate-700")}>
                    {rating} bintang
                  </span>
                </div>
                <span className={cn("text-xs font-semibold", isActive ? "text-blue-700" : "text-slate-400")}>
                  {isActive ? "Dipilih" : "Pilih"}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
