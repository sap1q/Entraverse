"use client";

import Link from "next/link";
import { Folder } from "lucide-react";
import { useMemo, useState } from "react";
import type { StorefrontCategory } from "@/lib/api/types";
import { resolveApiOriginUrl } from "@/lib/api-config";

type TradeInCategoryCardProps = {
  category: StorefrontCategory;
};

const ABSOLUTE_URL_REGEX = /^(https?:\/\/|data:|blob:)/i;

const isRawSvg = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.startsWith("<svg") || (trimmed.startsWith("<?xml") && trimmed.includes("<svg"));
};

const toAbsolute = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (ABSOLUTE_URL_REGEX.test(trimmed)) return trimmed;
  return resolveApiOriginUrl(trimmed);
};

const appendCandidate = (target: string[], value: string | null | undefined) => {
  if (!value) return;
  const trimmed = value.trim();
  if (!trimmed || target.includes(trimmed)) return;
  target.push(trimmed);
};

export function TradeInCategoryCard({ category }: TradeInCategoryCardProps) {
  const href = `/products?category=${encodeURIComponent(category.slug)}&trade_in=1`;
  const categorySignature = `${category.id}|${category.imageUrl ?? ""}|${category.imageSvg ?? ""}`;
  const inlineSvg = useMemo(() => {
    if (!category.imageSvg || !isRawSvg(category.imageSvg)) return null;
    return category.imageSvg;
  }, [category.imageSvg]);

  const imageCandidates = useMemo(() => {
    const candidates: string[] = [];

    appendCandidate(candidates, category.imageUrl);

    if (category.imageSvg && !isRawSvg(category.imageSvg)) {
      appendCandidate(candidates, category.imageSvg);
    }

    if (category.imageUrl) {
      const absolute = toAbsolute(category.imageUrl);
      appendCandidate(candidates, absolute);

      if (absolute.includes("/api/") && absolute.includes("/storage/")) {
        appendCandidate(candidates, absolute.replace("/api/", "/"));
      }

      const storagePathMatch = absolute.match(/(\/storage\/.+)$/);
      if (storagePathMatch?.[1]) {
        appendCandidate(candidates, resolveApiOriginUrl(storagePathMatch[1]));
      }
    }

    return candidates;
  }, [category.imageSvg, category.imageUrl]);

  const [imageState, setImageState] = useState<{ signature: string; index: number }>({
    signature: categorySignature,
    index: 0,
  });
  const imageIndex = imageState.signature === categorySignature ? imageState.index : 0;
  const activeImage = imageCandidates[imageIndex] ?? null;

  return (
    <Link
      href={href}
      className="group flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
        {activeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeImage}
            alt={category.name}
            className="h-full w-full object-contain"
            loading="lazy"
            onError={() => {
              setImageState((current) => {
                const currentIndex = current.signature === categorySignature ? current.index : 0;
                const nextIndex = currentIndex + 1;
                if (nextIndex >= imageCandidates.length) {
                  return { signature: categorySignature, index: imageCandidates.length };
                }

                return { signature: categorySignature, index: nextIndex };
              });
            }}
          />
        ) : inlineSvg ? (
          <div
            className="flex h-full w-full items-center justify-center [&_svg]:h-full [&_svg]:max-h-full [&_svg]:max-w-full [&_svg]:w-full"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: inlineSvg }}
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Folder className="h-10 w-10" />
          </div>
        )}
      </div>

      <h3 className="mt-4 text-sm font-semibold leading-snug text-slate-900 md:text-[15px]">
        {category.name}
      </h3>
    </Link>
  );
}
