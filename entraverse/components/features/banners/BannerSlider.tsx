"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId } from "react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Banner } from "@/lib/api/types/banner.types";
import { BannerCard } from "@/components/features/banners/BannerCard";

type BannerSliderProps = {
  banners: Banner[];
  loading?: boolean;
};

export function BannerSlider({ banners, loading = false }: BannerSliderProps) {
  const sliderId = useId().replace(/[:]/g, "");
  const prevClass = `banner-slider-prev-${sliderId}`;
  const nextClass = `banner-slider-next-${sliderId}`;
  const paginationClass = `banner-slider-pagination-${sliderId}`;
  const hasControls = banners.length > 1;

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-inset ring-slate-200/80 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="aspect-[2/1] w-full animate-pulse bg-[linear-gradient(135deg,#f8fbff_0%,#e8f0ff_52%,#edf5ff_100%)]" />
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-inset ring-slate-200/80 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="aspect-[2/1] w-full bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_52%,#f8fbff_100%)]" />
      </div>
    );
  }

  return (
    <div className="banner-slider-shell group relative overflow-hidden rounded-[28px] bg-white ring-1 ring-inset ring-slate-200/80 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        loop={hasControls}
        speed={650}
        autoplay={
          hasControls
            ? {
                delay: 5000,
                disableOnInteraction: false,
              }
            : false
        }
        pagination={
          hasControls
            ? {
                clickable: true,
                el: `.${paginationClass}`,
              }
            : false
        }
        navigation={
          hasControls
            ? {
                prevEl: `.${prevClass}`,
                nextEl: `.${nextClass}`,
              }
            : false
        }
        onBeforeInit={(swiper) => {
          if (!swiper.params.navigation || typeof swiper.params.navigation === "boolean") return;
          swiper.params.navigation.prevEl = `.${prevClass}`;
          swiper.params.navigation.nextEl = `.${nextClass}`;
          if (!swiper.params.pagination || typeof swiper.params.pagination === "boolean") return;
          swiper.params.pagination.el = `.${paginationClass}`;
        }}
        className="banner-slider-swiper bg-white"
      >
        {banners.map((banner, index) => (
          <SwiperSlide key={`${banner.id}-${banner.image_url}`}>
            <BannerCard banner={banner} isFirst={index === 0} />
          </SwiperSlide>
        ))}
      </Swiper>

      {hasControls ? (
        <>
          <button
            type="button"
            className={`${prevClass} banner-slider-nav left-3 hidden md:inline-flex xl:left-5`}
            aria-label="Previous banner"
          >
            <ChevronLeft className="h-4 w-4 stroke-[1.9]" />
          </button>

          <button
            type="button"
            className={`${nextClass} banner-slider-nav right-3 hidden md:inline-flex xl:right-5`}
            aria-label="Next banner"
          >
            <ChevronRight className="h-4 w-4 stroke-[1.9]" />
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-4 sm:bottom-4">
            <div
              className={`${paginationClass} banner-slider-pagination pointer-events-auto self-center shadow-[0_12px_30px_rgba(15,23,42,0.12)]`}
              aria-label="Banner pagination"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
