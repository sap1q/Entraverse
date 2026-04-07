import { Skeleton } from "@/components/ui/Skeleton";

const sectionHeights = [280, 232, 232, 264, 312, 216];

export default function TradeInQuestionSkeleton() {
  return (
    <div className="bg-[#f8fafc] pb-24 pt-8 md:pb-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 md:px-6">
        <section className="rounded-[28px] border border-slate-200/80 bg-white px-5 py-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)] md:px-8 md:py-8">
          <div className="space-y-4">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-12 w-full max-w-3xl" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_16px_48px_rgba(15,23,42,0.06)] md:p-6">
          <div className="mb-5">
            <Skeleton className="h-2 w-40 rounded-full md:w-64" />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="min-w-[250px] flex-1 rounded-[22px] border border-slate-200/80 px-4 py-4 md:min-w-0"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {sectionHeights.map((height, index) => (
              <section
                key={index}
                className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:p-6"
              >
                <div className="mb-5 flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-7 w-72 max-w-full" />
                    <Skeleton className="h-4 w-full max-w-xl" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Skeleton className={`w-full rounded-2xl`} style={{ height }} />
                </div>
              </section>
            ))}
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-24 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
              <div className="space-y-4">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
                <Skeleton className="h-8 w-4/5" />
                <Skeleton className="h-5 w-1/2" />
                <div className="space-y-3 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
                <div className="space-y-3 pt-5">
                  <Skeleton className="h-14 w-full rounded-2xl" />
                  <Skeleton className="h-11 w-full rounded-2xl" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/95 px-4 py-4 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-36" />
          </div>
          <Skeleton className="h-12 w-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
