"use client";

import Link from "next/link";
import { useId } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { StorefrontBrand } from "@/lib/api/types";

type BrandsSectionProps = {
  brands: StorefrontBrand[];
  error?: string | null;
};

export default function BrandsSection({ brands, error }: BrandsSectionProps) {
  const sliderId = useId().replace(/[:]/g, "");
  const prevClass = `brand-slider-prev-${sliderId}`;
  const nextClass = `brand-slider-next-${sliderId}`;

  return (
    <section className="bg-white py-8">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Brands</h2>

        {error ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        ) : null}

        {brands.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Brand belum tersedia.
          </div>
        ) : (
          <div className="grid grid-cols-[40px,1fr,40px] items-center gap-3">
            <button
              type="button"
              aria-label="Previous brands"
              className={`${prevClass} flex h-10 w-10 items-center justify-center rounded-full text-4xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900`}
            >
              ‹
            </button>

            <Swiper
              modules={[Navigation]}
              speed={550}
              loop={brands.length > 3}
              grabCursor
              navigation={{
                prevEl: `.${prevClass}`,
                nextEl: `.${nextClass}`,
              }}
              onBeforeInit={(swiper) => {
                if (!swiper.params.navigation || typeof swiper.params.navigation === "boolean") return;
                swiper.params.navigation.prevEl = `.${prevClass}`;
                swiper.params.navigation.nextEl = `.${nextClass}`;
              }}
              slidesPerView={1.2}
              spaceBetween={16}
              breakpoints={{
                640: { slidesPerView: 2, spaceBetween: 20 },
                1024: { slidesPerView: 3, spaceBetween: 24 },
              }}
              className="w-full"
            >
              {brands.map((brand) => (
                <SwiperSlide key={brand.id}>
                  <Link
                    href={`/products?selected_brand=${encodeURIComponent(brand.slug)}`}
                    className="flex h-[197px] items-center justify-center rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    {brand.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={brand.image} alt={brand.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-2xl font-bold tracking-wide text-slate-700">{brand.name}</span>
                    )}
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>

            <button
              type="button"
              aria-label="Next brands"
              className={`${nextClass} flex h-10 w-10 items-center justify-center rounded-full text-4xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900`}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
