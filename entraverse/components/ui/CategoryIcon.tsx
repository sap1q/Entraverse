"use client";

import { Folder } from "lucide-react";
import { resolveApiOriginUrl } from "@/lib/api-config";

type CategoryIconProps = {
  icon?: string | null;
  className?: string;
};

const resolveIconUrl = (icon: string): string => {
  return resolveApiOriginUrl(icon);
};

export default function CategoryIcon({ icon, className = "h-5 w-5" }: CategoryIconProps) {
  if (!icon || !icon.trim()) return <Folder className={`${className} text-slate-400`} />;

  const trimmed = icon.trim();

  if (trimmed.startsWith("<svg") || (trimmed.startsWith("<?xml") && trimmed.includes("<svg"))) {
    return <span className={className} dangerouslySetInnerHTML={{ __html: trimmed }} />;
  }

  const url = resolveIconUrl(trimmed);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Category icon" className={`${className} object-contain`} />
  );
}
