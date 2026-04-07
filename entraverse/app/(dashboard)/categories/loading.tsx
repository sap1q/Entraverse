"use client";

export default function CategoriesLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
    </div>
  );
}