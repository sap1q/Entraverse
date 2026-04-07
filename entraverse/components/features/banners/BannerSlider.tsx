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

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="aspect-[2/1] w-full animate-pulse bg-slate-200" />
        <div className="h-11 border-t border-blue-100 bg-white" />
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="aspect-[2/1] w-full bg-slate-50" />
        <div className="h-11 border-t border-blue-100 bg-white" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        loop={banners.length > 1}
        speed={650}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
          el: `.${paginationClass}`,
        }}
        navigation={{
          prevEl: `.${prevClass}`,
          nextEl: `.${nextClass}`,
        }}
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

      <div className="flex min-h-10 items-center justify-center border-t border-blue-100 bg-white px-4 py-1.5">
        <div className="inline-flex items-center justify-center gap-1.5">
          <button
            type="button"
            className={`${prevClass} inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-200 bg-[#dce2ee] text-slate-700 transition hover:bg-[#cfd7e8]`}
            aria-label="Previous banner"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <div className={`${paginationClass} banner-slider-pagination self-center`} aria-label="Banner pagination" />
          <button
            type="button"
            className={`${nextClass} inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-200 bg-[#dce2ee] text-slate-700 transition hover:bg-[#cfd7e8]`}
            aria-label="Next banner"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
