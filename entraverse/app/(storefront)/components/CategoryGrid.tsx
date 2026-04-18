"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { StorefrontCategory } from "@/lib/api/types";
import CategoryCard from "./CategoryCard";

type CategoryGridProps = {
  categories: StorefrontCategory[];
  totalCategories?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
  viewAllLabel?: string;
};

export default function CategoryGrid({
  categories,
  totalCategories,
  showViewAll = true,
  viewAllLink = "/products?view=all",
  viewAllLabel = "Lihat Semua Kategori",
}: CategoryGridProps) {
  const reduceMotion = useReducedMotion();
  const displayCategories = categories.slice(0, 6);
  const availableCount = typeof totalCategories === "number" && totalCategories > 0 ? totalCategories : categories.length;
  const counter =
    typeof totalCategories === "number" && totalCategories > 0 ? ` (${totalCategories})` : "";

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: reduceMotion ? 0 : 24,
      scale: reduceMotion ? 1 : 0.96,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: reduceMotion ? 0 : 0.48,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6 lg:gap-x-5"
      >
        {displayCategories.map((category) => (
          <motion.div
            key={category.id}
            variants={itemVariants}
            whileHover={reduceMotion ? undefined : { y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <CategoryCard
              category={category}
              className="min-w-[8.5rem] shrink-0 snap-start sm:min-w-0 sm:shrink"
            />
          </motion.div>
        ))}
      </motion.div>

      {showViewAll && availableCount > displayCategories.length ? (
        <div className="mt-8 flex justify-center">
          <Link
            href={viewAllLink}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-300 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            aria-label={`${viewAllLabel}${counter}`}
          >
            <span>
              {viewAllLabel}
              {counter}
            </span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      ) : null}
    </>
  );
}
