"use client";

import { LayoutGrid, List } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useProductFilters } from "@/hooks/useProductFilters";
import { cn } from "@/lib/utils";

const resolveView = (value: string | null): "grid" | "list" => {
  return value === "list" ? "list" : "grid";
};

export const ProductViewToggle = () => {
  const searchParams = useSearchParams();
  const { updateFilters } = useProductFilters();
  const activeView = resolveView(searchParams.get("view"));

  const handleToggle = (nextView: "grid" | "list") => {
    updateFilters({ view: nextView }, { resetPage: false });
  };

  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => handleToggle("grid")}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition",
          activeView === "grid" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
        )}
        aria-label="Tampilan grid"
      >
        <LayoutGrid className="h-4 w-4" />
        Grid
      </button>
      <button
        type="button"
        onClick={() => handleToggle("list")}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition",
          activeView === "list" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
        )}
        aria-label="Tampilan list"
      >
        <List className="h-4 w-4" />
        List
      </button>
    </div>
  );
};
