"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type WheelEventHandler } from "react";
import type { StorefrontProduct } from "@/lib/api/types";
import ProductCard from "./ProductCard";

type BestSellingProductsCarouselProps = {
  products: StorefrontProduct[];
};

export default function BestSellingProductsCarousel({ products }: BestSellingProductsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(products.length > 6);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const syncScrollState = () => {
      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      setCanScrollPrev(element.scrollLeft > 4);
      setCanScrollNext(maxScrollLeft - element.scrollLeft > 4);
    };

    syncScrollState();
    element.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);

    return () => {
      element.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
    };
  }, [products.length]);

  const scrollByCards = (direction: "prev" | "next") => {
    const element = scrollRef.current;
    if (!element) return;

    const card = element.querySelector<HTMLElement>("[data-best-selling-card]");
    const gap = 24;
    const distance = (card?.offsetWidth ?? element.clientWidth * 0.8) + gap;

    element.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  };

  const handleWheelScroll: WheelEventHandler<HTMLDivElement> = (event) => {
    const element = scrollRef.current;
    if (!element) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    if (element.scrollWidth <= element.clientWidth + 4) return;

    event.preventDefault();
    element.scrollLeft += event.deltaY;
  };

  return (
    <div className="best-selling-carousel relative">
      {canScrollPrev ? (
        <button
          type="button"
          aria-label="Produk terlaris sebelumnya"
          onClick={() => scrollByCards("prev")}
          className="best-selling-nav left-0 md:-left-2 xl:-left-5"
        >
          <ChevronLeft className="h-5 w-5 stroke-[1.75]" />
        </button>
      ) : null}

      <div
        ref={scrollRef}
        onWheel={handleWheelScroll}
        className="best-selling-track scrollbar-hidden gap-5 overflow-x-auto px-9 py-2 md:px-12 lg:gap-6 xl:px-0"
      >
        {products.map((product) => (
          <div key={product.id} data-best-selling-card className="min-w-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Produk terlaris berikutnya"
        onClick={() => scrollByCards("next")}
        disabled={!canScrollNext}
        className="best-selling-nav right-0 md:-right-2 xl:-right-5"
      >
        <ChevronRight className="h-5 w-5 stroke-[1.75]" />
      </button>
    </div>
  );
}
