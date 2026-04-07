"use client";

import Link from "next/link";
import { Folder } from "lucide-react";
import { useMemo, useState } from "react";
import { resolveApiOriginUrl } from "@/lib/api-config";
import type { StorefrontCategory } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type CategoryCardProps = {
  category: StorefrontCategory;
  className?: string;
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
  if (!trimmed) return;
  if (target.includes(trimmed)) return;
  target.push(trimmed);
};

export default function CategoryCard({ category, className }: CategoryCardProps) {
  const href = `/products?category=${encodeURIComponent(category.slug)}`;
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
        const storagePath = storagePathMatch[1];
        appendCandidate(candidates, resolveApiOriginUrl(storagePath));
        if (typeof window !== "undefined") {
          appendCandidate(candidates, `${window.location.origin}${storagePath}`);
        }
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
      className={cn(
        "group flex flex-col items-center text-center",
        className
      )}
    >
      <div className="w-full">
        <div className="mx-auto flex aspect-square w-full max-w-[150px] items-center justify-center overflow-hidden rounded-xl bg-[#dce8f9] p-5 transition-transform duration-300 ease-out group-hover:-translate-y-1">
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
            <div className="flex h-full w-full items-center justify-center rounded-lg bg-white/30">
              <Folder className="h-12 w-12 text-slate-500" />
            </div>
          )}
        </div>
      </div>

      <h3 className="mt-3 text-sm font-medium leading-snug text-slate-900 md:text-[15px]">
        {category.name}
      </h3>
      <span className="mt-1 text-xs font-medium text-slate-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        Lihat produk
      </span>
      <span className="sr-only">Buka kategori {category.name}</span>
    </Link>
  );
}
