import { Skeleton } from "@/components/ui/Skeleton";

const ContactCardSkeleton = () => (
  <article className="relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
    <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-[30px] bg-[linear-gradient(90deg,rgba(56,189,248,0.55),rgba(59,130,246,0.45),rgba(244,114,182,0.45))]" />
    <Skeleton className="h-14 w-14 rounded-2xl bg-slate-900/90" />
    <Skeleton className="mt-5 h-6 w-40 rounded-full" />
    <Skeleton className="mt-3 h-4 w-full rounded-full" />
    <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />
    <Skeleton className="mt-5 h-5 w-36 rounded-full" />
    <Skeleton className="mt-6 h-4 w-28 rounded-full bg-sky-100" />
  </article>
);

const FaqCardSkeleton = () => (
  <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
    <Skeleton className="h-6 w-4/5 rounded-full" />
    <Skeleton className="mt-4 h-4 w-full rounded-full" />
    <Skeleton className="mt-2 h-4 w-11/12 rounded-full" />
    <Skeleton className="mt-2 h-4 w-3/4 rounded-full" />
  </article>
);

export default function ContactUsLoading() {
  return (
    <div className="overflow-hidden bg-[linear-gradient(180deg,#f6f9ff_0%,#edf4ff_36%,#ffffff_100%)] text-slate-900">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(14,165,233,0.18),transparent_22%),radial-gradient(circle_at_70%_72%,rgba(236,72,153,0.10),transparent_22%)]" />
        <div className="absolute -left-20 top-24 h-64 w-64 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-36 md:px-6 md:pb-24 md:pt-40">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_460px]">
            <div className="max-w-3xl">
              <Skeleton className="h-10 w-52 rounded-full bg-white/80" />
              <Skeleton className="mt-6 h-14 w-full max-w-[42rem] rounded-[22px]" />
              <Skeleton className="mt-3 h-14 w-full max-w-[35rem] rounded-[22px]" />
              <Skeleton className="mt-6 h-5 w-full max-w-[38rem] rounded-full" />
              <Skeleton className="mt-3 h-5 w-full max-w-[34rem] rounded-full" />

              <div className="mt-8 flex flex-wrap gap-3">
                <Skeleton className="h-12 w-44 rounded-full bg-slate-900/90" />
                <Skeleton className="h-12 w-40 rounded-full bg-white/90" />
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[26px] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)] backdrop-blur"
                  >
                    <Skeleton className="h-3 w-20 rounded-full" />
                    <Skeleton className="mt-3 h-6 w-28 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(145deg,rgba(15,23,42,0.96)_0%,rgba(29,78,216,0.94)_58%,rgba(56,189,248,0.82)_100%)] p-6 text-white shadow-[0_30px_80px_rgba(30,41,59,0.24)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.16),transparent_26%)]" />
                <div className="relative">
                  <Skeleton className="h-9 w-36 rounded-full bg-white/15" />
                  <Skeleton className="mt-6 h-8 w-4/5 rounded-[18px] bg-white/20" />
                  <Skeleton className="mt-4 h-4 w-full rounded-full bg-white/15" />
                  <Skeleton className="mt-2 h-4 w-5/6 rounded-full bg-white/15" />

                  <div className="mt-8 space-y-4">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-[26px] border border-white/12 bg-white/10 p-4 backdrop-blur-sm"
                      >
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-5 w-5 rounded-full bg-white/20" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32 rounded-full bg-white/20" />
                            <Skeleton className="mt-3 h-4 w-full rounded-full bg-white/15" />
                            <Skeleton className="mt-2 h-4 w-4/5 rounded-full bg-white/15" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-6 pb-4">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <ContactCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[34px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_100%)] p-8 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
            <Skeleton className="h-10 w-56 rounded-full bg-sky-100" />
            <Skeleton className="mt-6 h-8 w-5/6 rounded-[18px]" />
            <Skeleton className="mt-4 h-4 w-full rounded-full" />
            <Skeleton className="mt-2 h-4 w-4/5 rounded-full" />

            <div className="mt-8 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <Skeleton className="h-5 w-40 rounded-full" />
                  <Skeleton className="mt-3 h-4 w-full rounded-full" />
                  <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-2xl bg-white/10" />
              <div className="flex-1">
                <Skeleton className="h-3 w-28 rounded-full bg-white/15" />
                <Skeleton className="mt-3 h-6 w-52 rounded-full bg-white/20" />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full bg-white/12" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-40 rounded-full bg-white/20" />
                      <Skeleton className="mt-3 h-4 w-full rounded-full bg-white/15" />
                      <Skeleton className="mt-2 h-4 w-4/5 rounded-full bg-white/15" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white/70 py-16 backdrop-blur-sm md:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Skeleton className="mx-auto h-3 w-24 rounded-full bg-sky-100" />
            <Skeleton className="mx-auto mt-4 h-8 w-full max-w-[28rem] rounded-[18px]" />
            <Skeleton className="mx-auto mt-4 h-4 w-full max-w-[32rem] rounded-full" />
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <FaqCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div className="relative overflow-hidden rounded-[38px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#eef5ff_42%,#dff3ff_100%)] px-6 py-10 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-10">
          <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-sky-300/25 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-indigo-300/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <Skeleton className="h-3 w-28 rounded-full bg-sky-100" />
              <Skeleton className="mt-4 h-8 w-full max-w-[32rem] rounded-[18px]" />
              <Skeleton className="mt-4 h-4 w-full max-w-[34rem] rounded-full" />
              <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />
            </div>

            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-12 w-36 rounded-full bg-slate-900/90" />
              <Skeleton className="h-12 w-40 rounded-full bg-white" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
