import { storefrontApi } from "@/lib/api/storefront";
import HeroSlider from "./components/HeroSlider";
import CategoriesSection from "./components/CategoriesSection";
import BestSellingProducts from "./components/BestSellingProducts";
import ProductsSection from "./components/ProductsSection";

export const revalidate = 60;

export default async function StorefrontPage() {
  const [categoriesResult, featuredResult, bestSellingResult, productsResult] = await Promise.all([
    storefrontApi.getCategories(12),
    storefrontApi.getFeaturedProducts(10),
    storefrontApi.getBestSellingProducts(10),
    storefrontApi.getNewestProducts(18),
  ]);

  const bestSellingProducts =
    featuredResult.data.length > 0
      ? featuredResult.data
      : bestSellingResult.data.length > 0
        ? bestSellingResult.data
        : productsResult.data.slice(0, 10);

  return (
    <div className="bg-[#f4f5f7]">
      <div className="bg-white">
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-6 md:px-6 md:pb-14 md:pt-8">
          <HeroSlider />
        </div>
      </div>

      <CategoriesSection
        categories={categoriesResult.data}
        totalCategories={categoriesResult.total}
        error={categoriesResult.error}
        viewAllLink="/products?view=all"
      />
      <BestSellingProducts products={bestSellingProducts} error={featuredResult.error ?? bestSellingResult.error} />
      <ProductsSection products={productsResult.data} error={productsResult.error} />
    </div>
  );
}
