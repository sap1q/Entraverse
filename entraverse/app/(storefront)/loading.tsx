import { Skeleton } from "@/components/ui/Skeleton";
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

const BestSellingCarouselSkeleton = () => (
  <div className="relative">
    <Skeleton className="absolute left-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 rounded-full md:block xl:-left-5" />
    <div className="flex gap-5 overflow-hidden px-9 py-2 md:px-12 lg:gap-6 xl:px-0">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="min-w-[15.5rem] flex-1">
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
    <Skeleton className="absolute right-0 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full xl:-right-5" />
  </div>
);

export default function StorefrontLoading() {
  return (
    <div className="bg-[#f4f5f7]">
      <div className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 md:px-6 md:pb-14 md:pt-8">
          <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
            <Skeleton className="aspect-[2/1] w-full rounded-none" />
            <div className="flex min-h-10 items-center justify-center border-t border-blue-100 bg-white px-4 py-1.5">
              <div className="inline-flex items-center justify-center gap-1.5">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-2 w-14 rounded-full" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <CategoryGridSkeleton />

      <section className="bg-white py-14 md:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <SectionHeadingSkeleton eyebrowWidth="w-24" titleWidth="w-64 max-w-full" descriptionWidth="w-full max-w-md" />
          <BestSellingCarouselSkeleton />
        </div>
      </section>

      <section className="bg-white py-14 md:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <SectionHeadingSkeleton eyebrowWidth="w-28" titleWidth="w-56 max-w-full" descriptionWidth="w-full max-w-xl" />

          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Skeleton className="h-14 w-full max-w-[17rem] rounded-xl" />
          </div>
        </div>
      </section>
    </div>
  );
}
