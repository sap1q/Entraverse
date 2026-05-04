"use client";

import Link from "next/link";
import type { Banner } from "@/lib/api/types/banner.types";

type BannerCardProps = {
  banner: Banner;
  isFirst?: boolean;
};

export function BannerCard({ banner, isFirst = false }: BannerCardProps) {
  const alt = banner.alt_text || banner.title || "Banner Entraverse";

  const content = (
    <div className="relative aspect-[2/1] w-full overflow-hidden bg-slate-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner.image_url}
        alt={alt}
        loading={isFirst ? "eager" : "lazy"}
        fetchPriority={isFirst ? "high" : "auto"}
        decoding="async"
        className="block h-full w-full object-contain object-center transition-transform duration-700 ease-out group-hover:scale-[1.01]"
      />
    </div>
  );

  if (!banner.link_url) {
    return content;
  }

  return (
    <Link href={banner.link_url} className="group block">
      {content}
    </Link>
  );
}
