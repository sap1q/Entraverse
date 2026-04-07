"use client";

import { useMemo, useState } from "react";

interface UseProductGalleryResult {
  images: string[];
  activeIndex: number;
  activeImage: string;
  zoomed: boolean;
  setActiveIndex: (index: number) => void;
  next: () => void;
  previous: () => void;
  setZoomed: (value: boolean) => void;
}

const FALLBACK_IMAGE = "/assets/images/hero/e-hero.png";

export const useProductGallery = (gallery: string[], primaryImage?: string): UseProductGalleryResult => {
  const images = useMemo(() => {
    const source = [primaryImage, ...gallery]
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);

    const unique = Array.from(new Set(source));
    return unique.length > 0 ? unique : [FALLBACK_IMAGE];
  }, [gallery, primaryImage]);

  const [activeIndex, setActiveIndexState] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const setActiveIndex = (index: number) => {
    const bounded = Math.min(images.length - 1, Math.max(0, index));
    setActiveIndexState(bounded);
    setZoomed(false);
  };

  const next = () => {
    setActiveIndexState((previous) => {
      const nextIndex = (previous + 1) % images.length;
      return nextIndex;
    });
    setZoomed(false);
  };

  const previous = () => {
    setActiveIndexState((previousValue) => {
      const nextIndex = (previousValue - 1 + images.length) % images.length;
      return nextIndex;
    });
    setZoomed(false);
  };

  return {
    images,
    activeIndex,
    activeImage: images[activeIndex] ?? images[0],
    zoomed,
    setActiveIndex,
    next,
    previous,
    setZoomed,
  };
};
