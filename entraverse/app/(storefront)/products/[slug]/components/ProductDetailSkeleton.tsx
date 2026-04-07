import { Skeleton } from "@/components/ui/Skeleton";

export const ProductDetailSkeleton = () => {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="mb-8 h-4 w-64" />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="rounded-3xl border border-transparent bg-white p-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <Skeleton className="aspect-square w-full rounded-2xl" />

                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="hidden h-20 w-full rounded-xl sm:block" />
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-8 w-5/6 rounded-lg" />
                <Skeleton className="h-10 w-1/2 rounded-lg" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <Skeleton className="h-[430px] w-full rounded-3xl" />
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    </div>
  );
};
