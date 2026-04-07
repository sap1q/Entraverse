"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryMainImageProps {
  image: string;
  index: number;
  total: number;
  name: string;
  onPrevious: () => void;
  onNext: () => void;
  zoomed: boolean;
  onZoomChange: (value: boolean) => void;
}

export const GalleryMainImage = ({
  image,
  index,
  total,
  name,
  onPrevious,
  onNext,
  zoomed,
  onZoomChange,
}: GalleryMainImageProps) => {
  const [origin, setOrigin] = useState("center center");

  return (
    <div
      className="group relative order-1 aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white"
      onMouseEnter={() => onZoomChange(true)}
      onMouseLeave={() => {
        onZoomChange(false);
        setOrigin("center center");
      }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        setOrigin(`${x}% ${y}%`);
      }}
    >
      <motion.div
        key={image}
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="relative h-full w-full"
      >
        <Image
          src={image}
          alt={name}
          fill
          priority
          unoptimized
          className={cn("object-contain p-4 transition-transform duration-300 ease-out", zoomed ? "scale-[1.45]" : "scale-100")}
          style={{ transformOrigin: origin }}
          sizes="(max-width: 1024px) 100vw, 780px"
        />
      </motion.div>

      <button
        type="button"
        onClick={onPrevious}
        className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 shadow-sm backdrop-blur md:hidden"
        aria-label="Gambar sebelumnya"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onNext}
        className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 shadow-sm backdrop-blur md:hidden"
        aria-label="Gambar berikutnya"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-white md:hidden">
        {index + 1}/{total}
      </div>
    </div>
  );
};
