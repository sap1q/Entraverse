"use client";

import { Gallery, GalleryMainImage, GalleryThumbnailList } from "@/components/ui/Gallery";
import { useProductGallery } from "@/hooks/useProductGallery";
import type { ProductDetail } from "@/types/product.types";
import { ProductInfo } from "./ProductInfo";

interface ProductHeroProps {
  product: ProductDetail;
  selectedPrice: number;
  selectedVariants: Record<string, string>;
  onVariantChange: (groupName: string, option: string) => void;
}

export const ProductHero = ({ product, selectedPrice, selectedVariants, onVariantChange }: ProductHeroProps) => {
  const { images, activeIndex, activeImage, zoomed, setZoomed, setActiveIndex, next, previous } = useProductGallery(
    product.gallery,
    product.image
  );

  return (
    <section className="rounded-3xl border border-transparent bg-white p-4 sm:p-6">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Gallery>
          <GalleryThumbnailList images={images} activeIndex={activeIndex} onSelect={setActiveIndex} productName={product.name} />
          <GalleryMainImage
            image={activeImage}
            index={activeIndex}
            total={images.length}
            name={product.name}
            onPrevious={previous}
            onNext={next}
            zoomed={zoomed}
            onZoomChange={setZoomed}
          />
        </Gallery>

        <ProductInfo
          product={product}
          selectedPrice={selectedPrice}
          selectedVariants={selectedVariants}
          onVariantChange={onVariantChange}
        />
      </div>
    </section>
  );
};
