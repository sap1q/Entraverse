"use client";

import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductDetailSkeleton } from "./products/[slug]/components/ProductDetailSkeleton";
import TradeInQuestionSkeleton from "./trade-in/question/components/TradeInQuestionSkeleton";
import CategoryGridSkeleton from "./components/CategoryGridSkeleton";

const SectionHeadingSkeleton = ({
  eyebrowWidth,
  titleWidth,
  descriptionWidth,
}: {
  eyebrowWidth: string;
  titleWidth: string;
  descriptionWidth: string;
}) => (
  <div className="mb-8 max-w-2xl space-y-3 md:mb-10">
    <Skeleton className={`h-3 rounded-full ${eyebrowWidth}`} />
    <Skeleton className={`h-8 rounded-xl md:h-10 ${titleWidth}`} />
    <Skeleton className={`h-4 rounded-full ${descriptionWidth}`} />
  </div>
);

const ProductCardSkeleton = () => (
  <article className="h-full rounded-[1.35rem] bg-white">
    <div className="rounded-[1.15rem] bg-white px-4 pb-4 pt-5">
      <div className="relative mx-auto aspect-square w-full max-w-[11.5rem] overflow-hidden rounded-[1.35rem] bg-slate-100">
        <Skeleton className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full bg-white" />
        <Skeleton className="h-full w-full rounded-[1.35rem]" />
      </div>
    </div>

    <div className="flex flex-1 flex-col px-1 pb-2 pt-4 sm:px-2">
      <Skeleton className="h-5 w-full rounded-full" />
      <Skeleton className="mt-2 h-5 w-5/6 rounded-full" />
      <Skeleton className="mt-2 h-5 w-2/3 rounded-full" />
      <Skeleton className="mt-5 h-7 w-1/2 rounded-full" />
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-20 rounded-full" />
      </div>
    </div>
  </article>
);

const ProductCarouselSkeleton = () => (
  <div className="relative">
    <Skeleton className="absolute left-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 rounded-full md:block xl:-left-5" />
    <div className="flex gap-5 overflow-hidden px-9 py-2 md:px-12 lg:gap-6 xl:px-0">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="min-w-[12.5rem] flex-1 sm:min-w-[15.5rem]">
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
    <Skeleton className="absolute right-0 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full xl:-right-5" />
  </div>
);

export default function StorefrontLoading() {
  const pathname = usePathname();

  if (pathname?.startsWith("/trade-in/question")) {
    return <TradeInQuestionSkeleton />;
  }

  if (pathname?.startsWith("/products/") && pathname !== "/products") {
    return (
      <div className="min-h-screen bg-white py-6">
        <ProductDetailSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-[#f4f5f7]">
      <div className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 md:px-6 md:pb-14 md:pt-8">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <Skeleton className="aspect-[2/1] w-full rounded-none" />
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4 sm:bottom-4">
              <div className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/70 bg-white/85 px-2.5 py-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                <Skeleton className="h-2 w-14 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <CategoryGridSkeleton />

      <section className="bg-white py-14 md:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <SectionHeadingSkeleton eyebrowWidth="w-24" titleWidth="w-64 max-w-full" descriptionWidth="w-full max-w-md" />
          <ProductCarouselSkeleton />
        </div>
      </section>

      <section className="bg-white py-14 md:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <SectionHeadingSkeleton eyebrowWidth="w-28" titleWidth="w-56 max-w-full" descriptionWidth="w-full max-w-xl" />
          <ProductCarouselSkeleton />

          <div className="mt-10 flex justify-center">
            <Skeleton className="h-14 w-full max-w-[17rem] rounded-xl" />
          </div>
        </div>
      </section>
    </div>
  );
}
