import { cn } from "@/lib/utils";

interface ProductGridSkeletonProps {
  count?: number;
  view?: "grid" | "list";
}

export const ProductGridSkeleton = ({ count = 8, view = "grid" }: ProductGridSkeletonProps) => {
  return (
    <div
      className={cn(
        "grid gap-3 md:gap-4",
        view === "list" ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={index}
          className={cn(
            "overflow-hidden rounded-2xl border border-slate-200 bg-white",
            view === "list" ? "md:flex md:min-h-[220px]" : ""
          )}
        >
          <div className={cn("animate-pulse bg-slate-200", view === "list" ? "md:w-64" : "aspect-square")} />

          <div className="flex-1 space-y-3 p-4">
            <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
          </div>
        </article>
      ))}
    </div>
  );
};
