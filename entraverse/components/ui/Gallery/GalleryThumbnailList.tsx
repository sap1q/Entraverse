"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface GalleryThumbnailListProps {
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  productName: string;
}

export const GalleryThumbnailList = ({ images, activeIndex, onSelect, productName }: GalleryThumbnailListProps) => {
  return (
    <div className="order-2 flex gap-2 overflow-x-auto pb-1">
      {images.map((image, index) => (
        <button
          key={`${image}-${index}`}
          type="button"
          onClick={() => onSelect(index)}
          className={cn(
            "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition",
            activeIndex === index ? "border-blue-600 shadow-[0_14px_30px_-22px_rgba(37,99,235,0.95)]" : "border-slate-200 hover:border-slate-300"
          )}
          aria-label={`Gambar ${index + 1}`}
        >
          <Image src={image} alt={`${productName} thumbnail ${index + 1}`} fill className="object-cover" unoptimized sizes="88px" />
        </button>
      ))}
    </div>
  );
};
