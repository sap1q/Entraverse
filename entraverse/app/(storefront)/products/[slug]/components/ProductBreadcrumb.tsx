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
    <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
      <Link href="/" className="transition-colors hover:text-blue-600">
        Beranda
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link href="/products" className="transition-colors hover:text-blue-600">
        Produk
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link href={`/products?category=${encodeURIComponent(category.slug)}`} className="transition-colors hover:text-blue-600">
        {category.name}
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="font-medium text-slate-900">{productName}</span>
    </nav>
  );
};
