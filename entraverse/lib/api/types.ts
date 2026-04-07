export type ApiListResult<T> = {
  data: T[];
  error: string | null;
  total: number;
};

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  imageSvg: string | null;
};

export type StorefrontBrand = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  formattedPrice: string;
  image: string | null;
  brand: string | null;
  category: string | null;
  stock: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
};

export type HeroSlide = {
  id: string;
  image: string;
  url?: string;
  title?: string;
};

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  role: string;
};

export type WhyChooseItem = {
  id: string;
  title: string;
  description: string;
  icon: "package" | "shield" | "badge-percent" | "headset";
};
