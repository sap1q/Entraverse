import { Skeleton } from "@/components/ui/Skeleton";

export default function CategoryGridSkeleton() {
  return (
    <section className="bg-white py-8 md:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6 lg:gap-x-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex min-w-[8.5rem] shrink-0 snap-start flex-col items-center text-center sm:min-w-0 sm:shrink">
              <div className="w-full">
                <div className="mx-auto flex aspect-square w-full max-w-[150px] items-center justify-center rounded-xl bg-[#dce8f9] p-5">
                  <Skeleton className="h-full w-full rounded-lg bg-white/65" />
                </div>
              </div>
              <Skeleton className="mt-3 h-4 w-24 rounded-full" />
              <Skeleton className="mt-2 h-3 w-16 rounded-full" />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Skeleton className="h-10 w-48 rounded-full" />
        </div>
      </div>
    </section>
  );
}
