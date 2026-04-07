"use client";

import type { MouseEventHandler } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type WishlistHeartButtonProps = {
  active: boolean;
  pending?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  iconClassName?: string;
};

export function WishlistHeartButton({
  active,
  pending = false,
  onClick,
  className,
  iconClassName,
}: WishlistHeartButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={pending}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
      className={cn(
        "relative isolate inline-flex items-center justify-center border-0 bg-transparent p-0 shadow-none transition-all duration-200",
        pending ? "cursor-not-allowed opacity-70" : "",
        className
      )}
      aria-label={active ? "Hapus dari wishlist" : "Tambah ke wishlist"}
    >
      <AnimatePresence initial={false}>
        {active ? (
          <motion.span
            className="pointer-events-none absolute inset-0 bg-rose-100/40"
            initial={{ scale: 0.4, opacity: 0.7 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        ) : null}
      </AnimatePresence>

      <motion.span
        className="relative z-10 inline-flex"
        animate={
          prefersReducedMotion
            ? undefined
            : active
              ? { scale: [1, 1.22, 1], rotate: [0, -10, 0] }
              : { scale: 1, rotate: 0 }
        }
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <Heart
          className={cn(
            "transition-colors duration-200",
            active ? "fill-rose-500 text-rose-500" : "text-slate-500",
            iconClassName
          )}
        />
      </motion.span>
    </motion.button>
  );
}
