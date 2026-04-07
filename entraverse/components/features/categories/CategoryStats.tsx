"use client";

import { Activity, BarChart3, Layers, Trash2 } from "lucide-react";
import type { CategoryStats as CategoryStatsType } from "@/types/category.types";

type CategoryStatsProps = {
  stats: CategoryStatsType | null;
  isLoading?: boolean;
};

type StatCard = {
  key: keyof CategoryStatsType;
  label: string;
  icon: typeof Layers;
  suffix?: string;
};

const cards: readonly StatCard[] = [
  { key: "total", label: "Total Kategori", icon: Layers },
  { key: "active", label: "Kategori Aktif", icon: Activity },
  { key: "deleted", label: "Terhapus", icon: Trash2 },
  { key: "avg_margin", label: "Rata-rata Margin", icon: BarChart3, suffix: "%" },
];

export default function CategoryStats({ stats, isLoading = false }: CategoryStatsProps) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const rawValue = stats?.[card.key] ?? 0;
        const value = typeof rawValue === "number" ? rawValue : Number(rawValue);

        return (
          <article key={card.key} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-800">
              {isLoading ? "..." : `${value.toLocaleString("id-ID")}${card.suffix ?? ""}`}
            </p>
          </article>
        );
      })}
    </section>
  );
}
