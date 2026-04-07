import { ProductDetailSkeleton } from "./components/ProductDetailSkeleton";

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-white py-6">
      <ProductDetailSkeleton />
    </div>
  );
}
