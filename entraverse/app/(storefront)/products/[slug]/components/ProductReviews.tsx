"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Camera, Star } from "lucide-react";
import { productsApi } from "@/lib/api/products";
import { formatDateID } from "@/lib/utils/formatter";
import { Button } from "@/components/ui/Button";
import { RatingStars } from "@/components/ui/RatingStars";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { ProductReview, ProductReviewSummary } from "@/types/product.types";

interface ProductReviewsProps {
  productId: string;
  initialSummary: ProductReviewSummary;
  embedded?: boolean;
}

const EMPTY_SUMMARY: ProductReviewSummary = {
  average_rating: 0,
  total_count: 0,
  distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
};

const EMPTY_REVIEWS: ProductReview[] = [];

export const ProductReviews = ({
  productId,
  initialSummary,
  embedded = false,
}: ProductReviewsProps) => {
  const shouldRequestRemoteReviews = (initialSummary?.total_count ?? 0) > 0;
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ProductReviewSummary>(
    initialSummary ?? EMPTY_SUMMARY
  );
  const [loading, setLoading] = useState(shouldRequestRemoteReviews);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "highest" | "lowest">("newest");
  const [onlyPhotos, setOnlyPhotos] = useState(false);
  const [starFilter, setStarFilter] = useState(0);

  useEffect(() => {
    let active = true;

    if (!shouldRequestRemoteReviews) {
      return () => {
        active = false;
      };
    }

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await productsApi.getProductReviews(productId, {
          page: 1,
          sort,
          with_photos: onlyPhotos || undefined,
        });

        if (!active) return;
        setReviews(response.data);
        setSummary(response.meta.summary || initialSummary || EMPTY_SUMMARY);
      } catch {
        if (!active) return;
        setReviews([]);
        setSummary(initialSummary ?? EMPTY_SUMMARY);
        setError(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [initialSummary, onlyPhotos, productId, shouldRequestRemoteReviews, sort]);

  const resolvedSummary = shouldRequestRemoteReviews ? summary : (initialSummary ?? EMPTY_SUMMARY);
  const resolvedReviews = shouldRequestRemoteReviews ? reviews : EMPTY_REVIEWS;
  const resolvedError = shouldRequestRemoteReviews ? error : null;

  const filteredReviews = useMemo(() => {
    if (starFilter === 0) return resolvedReviews;
    return resolvedReviews.filter((review) => Math.round(review.rating) === starFilter);
  }, [resolvedReviews, starFilter]);

  return (
    <section
      className={cn(
        !embedded && "rounded-3xl border border-transparent bg-white p-6"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className={cn(
            "font-semibold text-slate-900",
            embedded ? "text-xl" : "text-3xl"
          )}
        >
          Penilaian dan Ulasan ({resolvedSummary.total_count})
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            Urutkan
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none"
            >
              <option value="newest">Terbaru</option>
              <option value="highest">Rating Tertinggi</option>
              <option value="lowest">Rating Terendah</option>
            </select>
          </label>

          <Button
            type="button"
            variant={onlyPhotos ? "default" : "outline"}
            className="h-9"
            onClick={() => setOnlyPhotos((previous) => !previous)}
          >
            <Camera className="h-4 w-4" />
            Foto Saja
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-7 md:grid-cols-[240px_minmax(0,1fr)]",
          embedded ? "mt-5 gap-5" : "mt-7"
        )}
      >
        <div>
          <p
            className={cn(
              "font-bold text-slate-900",
              embedded ? "text-4xl" : "text-5xl"
            )}
          >
            {resolvedSummary.average_rating.toFixed(1)}
          </p>
          <RatingStars rating={resolvedSummary.average_rating} size="lg" className="mt-2" />
          <p className="mt-1 text-sm text-slate-500">
            dari {resolvedSummary.total_count} ulasan
          </p>
        </div>

        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count =
              resolvedSummary.distribution[
                star as keyof ProductReviewSummary["distribution"]
              ] ?? 0;
            const width =
              resolvedSummary.total_count > 0 ? (count / resolvedSummary.total_count) * 100 : 0;

            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() =>
                    setStarFilter((previous) => (previous === star ? 0 : star))
                  }
                  className={
                    starFilter === star
                      ? "w-14 rounded-md bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700"
                      : "w-14 rounded-md px-1.5 py-0.5 text-slate-600 hover:bg-slate-50"
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    <span>{star}</span>
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </span>
                </button>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-orange-400"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="w-10 text-right text-slate-500">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className={cn("space-y-6", embedded ? "mt-6" : "mt-8")}>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {!loading && resolvedError ? (
        <p
          className={cn(
            "text-sm font-medium text-rose-600",
            embedded ? "mt-4" : "mt-6"
          )}
        >
          {resolvedError}
        </p>
      ) : null}

      {!loading && !resolvedError ? (
        <div className={cn("space-y-6", embedded ? "mt-6" : "mt-8")}>
          {filteredReviews.length === 0 ? (
            <div className="rounded-xl border border-transparent px-4 py-10 text-center text-sm text-slate-500">
              {resolvedReviews.length === 0
                ? "Belum ada ulasan untuk produk ini."
                : "Belum ada ulasan dengan filter yang dipilih."}
            </div>
          ) : (
            filteredReviews.map((review) => (
              <article
                key={review.id}
                className="border-b border-slate-100 pb-6 last:border-none last:pb-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-100">
                      {review.user.avatar ? (
                        <Image
                          src={review.user.avatar}
                          alt={review.user.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-sm font-semibold text-slate-700">
                          {review.user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {review.user.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateID(review.created_at)}
                      </p>
                    </div>
                  </div>

                  <RatingStars rating={review.rating} size="sm" />
                </div>

                {review.variant ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Varian: {review.variant}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {review.comment}
                </p>

                {review.photos && review.photos.length > 0 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {review.photos.map((photo, index) => (
                      <div
                        key={`${review.id}-${index}`}
                        className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200"
                      >
                        <Image
                          src={photo}
                          alt={`Foto ulasan ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
};
