import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface ProductBreadcrumbProps {
  category: {
    name: string;
    slug: string;
  };
  productName: string;
}

export const ProductBreadcrumb = ({ category, productName }: ProductBreadcrumbProps) => {
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-2 overflow-hidden text-sm text-slate-500" aria-label="Breadcrumb">
      <Link href="/" className="shrink-0 transition-colors hover:text-blue-600">
        Beranda
      </Link>
      <ChevronRight className="h-4 w-4 shrink-0" />
      <Link href="/products" className="shrink-0 transition-colors hover:text-blue-600">
        Produk
      </Link>
      <ChevronRight className="h-4 w-4 shrink-0" />
      <Link
        href={`/products?category=${encodeURIComponent(category.slug)}`}
        className="max-w-full truncate transition-colors hover:text-blue-600"
      >
        {category.name}
      </Link>
      <ChevronRight className="h-4 w-4 shrink-0" />
      <span className="min-w-0 max-w-full truncate font-medium text-slate-900">{productName}</span>
    </nav>
  );
};
