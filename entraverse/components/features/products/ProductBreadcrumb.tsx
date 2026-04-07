"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

const prettifySlug = (slug: string): string => {
  return slug
    .split("-")
    .filter((item) => item.length > 0)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
};

export const ProductBreadcrumb = () => {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const productsIndex = segments.indexOf("products");
  const categorySlug = productsIndex >= 0 ? segments[productsIndex + 1] : undefined;

  return (
    <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
      <Link href="/" className="transition-colors hover:text-blue-600">
        Home
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link href="/products" className="transition-colors hover:text-blue-600">
        Produk
      </Link>
      {categorySlug ? (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-slate-800">{prettifySlug(categorySlug)}</span>
        </>
      ) : null}
    </nav>
  );
};
