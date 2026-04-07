"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradeInOptionCardProps {
  title: string;
  description?: string;
  impactLabel?: string;
  selected: boolean;
  onSelect: () => void;
}

export function TradeInOptionCard({
  title,
  description,
  impactLabel,
  selected,
  onSelect,
}: TradeInOptionCardProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className={cn(
        "group w-full rounded-[24px] border bg-white p-5 text-left shadow-[0_14px_45px_-36px_rgba(15,23,42,0.55)] transition duration-200",
        selected
          ? "border-blue-600 bg-blue-50/70 shadow-[0_18px_48px_-30px_rgba(37,99,235,0.35)]"
          : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          ) : null}
        </div>

        <div
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition",
            selected
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 bg-white text-transparent group-hover:border-blue-300"
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
        </div>
      </div>

      {impactLabel ? (
        <div
          className={cn(
            "mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            selected ? "bg-white text-blue-700" : "bg-slate-100 text-slate-600"
          )}
        >
          {impactLabel}
        </div>
      ) : null}
    </motion.button>
  );
}
