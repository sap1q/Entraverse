type SortBy = "popular" | "price_asc" | "price_desc" | "newest" | "rating";

type MockReview = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  variant?: string;
  photos?: string[];
  user: {
    name: string;
    avatar?: string;
  };
};

type MockCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string;
};

type MockBrand = {
  id: string;
  name: string;
  slug: string;
  logo?: string;
};

type MockBanner = {
  id: string;
  title?: string | null;
  alt_text?: string | null;
  image_path: string;
  image_url: string;
  link_url?: string | null;
  order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type MockProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: MockCategory;
  brand: MockBrand;
  entraverse_price: number;
  offline_price: number;
  original_price?: number;
  rating: number;
  sold_count: number;
  stock: number;
  image: string;
  gallery: string[];
  specifications: Record<string, string>;
  warranty?: string;
  sku: string;
  weight: number;
  trade_in?: boolean;
  free_shipping?: boolean;
  featured?: boolean;
  best_selling?: boolean;
  active?: boolean;
  created_at: string;
  variant_pricing?: Array<{
    sku?: string;
    label?: string;
    options?: Record<string, string>;
    stock?: number;
    offline_price?: number;
    entraverse_price?: number;
    tokopedia_price?: number;
    shopee_price?: number;
  }>;
  reviews: MockReview[];
};

type ProductQuery = {
  search?: string;
  categories?: string[];
  brands?: string[];
  ratings?: number[];
  priceMin?: number | null;
  priceMax?: number | null;
  tradeIn?: boolean;
  bestSelling?: boolean;
  featured?: boolean;
  onlyActive?: boolean;
  sortBy?: SortBy;
  page?: number;
  perPage?: number;
};

const CATEGORIES: MockCategory[] = [
  { id: "cat-vr", name: "VR Headset", slug: "vr-headset", icon: "/assets/images/icons/VR cat.jpeg" },
  { id: "cat-smart", name: "Smart Device", slug: "smart-device", icon: "/assets/images/icons/Smart cat.jpeg" },
  { id: "cat-console", name: "Gaming Console", slug: "gaming-console", icon: "/assets/images/icons/Konsol cat.jpeg" },
  { id: "cat-home", name: "Home Entertainment", slug: "home-entertainment", icon: "/assets/images/icons/Home cat.jpeg" },
  { id: "cat-acc", name: "Accessories", slug: "accessories", icon: "/assets/images/icons/Accessory cat.jpeg" },
  { id: "cat-media", name: "Physical Media", slug: "physical-media", icon: "/assets/images/icons/CD cat.jpeg" },
];

const BRANDS: MockBrand[] = [
  { id: "brand-meta", name: "Meta", slug: "meta" },
  { id: "brand-sony", name: "Sony", slug: "sony" },
  { id: "brand-nintendo", name: "Nintendo", slug: "nintendo" },
  { id: "brand-jbl", name: "JBL", slug: "jbl" },
  { id: "brand-xiaomi", name: "Xiaomi", slug: "xiaomi" },
  { id: "brand-insta360", name: "Insta360", slug: "insta360" },
];

const MOCK_BANNERS: MockBanner[] = [
  {
    id: "banner-rayban-meta",
    title: "Ray-Ban Meta Gen 2",
    alt_text: "Ray-Ban Meta smart glasses collection",
    image_path: "/assets/images/hero/e-hero.png",
    image_url: "/assets/images/hero/e-hero.png",
    link_url: "/products?search=meta",
    order: 1,
    is_active: true,
    created_at: "2026-03-28T09:00:00.000Z",
    updated_at: "2026-03-28T09:00:00.000Z",
    deleted_at: null,
  },
  {
    id: "banner-vr-upgrade",
    title: "Upgrade ke VR Generasi Baru",
    alt_text: "Meta Quest dan console deals di Entraverse",
    image_path: "/assets/images/hero/e-hero.png",
    image_url: "/assets/images/hero/e-hero.png",
    link_url: "/products?category=vr-headset",
    order: 2,
    is_active: true,
    created_at: "2026-03-29T09:00:00.000Z",
    updated_at: "2026-03-29T09:00:00.000Z",
    deleted_at: null,
  },
];

const getCategory = (slug: string) => CATEGORIES.find((item) => item.slug === slug) ?? CATEGORIES[0];
const getBrand = (slug: string) => BRANDS.find((item) => item.slug === slug) ?? BRANDS[0];

const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "prod-meta-quest-3-512",
    name: "Meta Quest 3 512GB",
    slug: "meta-quest-3-512gb",
    description: "Headset mixed reality flagship untuk gaming, fitness, dan produktivitas.",
    category: getCategory("vr-headset"),
    brand: getBrand("meta"),
    entraverse_price: 9499000,
    offline_price: 9799000,
    original_price: 10499000,
    rating: 4.9,
    sold_count: 82,
    stock: 12,
    image: "/assets/images/hero/e-hero.png",
    gallery: ["/assets/images/hero/e-hero.png", "/product-placeholder.svg"],
    specifications: {
      Display: "Dual LCD 2064 x 2208 per-eye",
      Storage: "512GB",
      Connectivity: "Wi-Fi 6E",
    },
    warranty: "Garansi toko 12 bulan",
    sku: "MQ3-512",
    weight: 0.52,
    trade_in: true,
    free_shipping: true,
    featured: true,
    best_selling: true,
    created_at: "2026-03-26T09:00:00.000Z",
    variant_pricing: [
      {
        sku: "MQ3-512",
        label: "512GB",
        options: { Storage: "512GB" },
        stock: 12,
        offline_price: 9799000,
        entraverse_price: 9499000,
        tokopedia_price: 9699000,
        shopee_price: 9649000,
      },
    ],
    reviews: [
      {
        id: "review-mq3-1",
        rating: 5,
        comment: "Tracking mantap dan setup cepat.",
        created_at: "2026-03-20T08:00:00.000Z",
        user: { name: "Rama" },
      },
      {
        id: "review-mq3-2",
        rating: 5,
        comment: "Image clarity naik jauh dibanding generasi sebelumnya.",
        created_at: "2026-03-24T14:15:00.000Z",
        user: { name: "Satrio" },
      },
    ],
  },
  {
    id: "prod-meta-quest-3s",
    name: "Meta Quest 3S",
    slug: "meta-quest-3s",
    description: "Pilihan entry-level mixed reality untuk main game dan entertainment keluarga.",
    category: getCategory("vr-headset"),
    brand: getBrand("meta"),
    entraverse_price: 5799000,
    offline_price: 5999000,
    original_price: 6299000,
    rating: 4.7,
    sold_count: 58,
    stock: 18,
    image: "/assets/images/hero/e-hero.png",
    gallery: ["/assets/images/hero/e-hero.png"],
    specifications: {
      Display: "Fast-switch LCD",
      Storage: "128GB",
      Audio: "Integrated spatial audio",
    },
    warranty: "Garansi toko 12 bulan",
    sku: "MQ3S-128",
    weight: 0.51,
    trade_in: true,
    free_shipping: true,
    best_selling: true,
    created_at: "2026-03-22T09:00:00.000Z",
    reviews: [
      {
        id: "review-mq3s-1",
        rating: 5,
        comment: "Worth it buat masuk ke ekosistem Meta tanpa overbudget.",
        created_at: "2026-03-25T09:30:00.000Z",
        user: { name: "Dian" },
      },
    ],
  },
  {
    id: "prod-ps5-slim",
    name: "PlayStation 5 Slim Disc Edition",
    slug: "playstation-5-slim-disc-edition",
    description: "Konsol generasi terbaru dengan performa stabil untuk game AAA.",
    category: getCategory("gaming-console"),
    brand: getBrand("sony"),
    entraverse_price: 8299000,
    offline_price: 8499000,
    original_price: 8999000,
    rating: 4.8,
    sold_count: 64,
    stock: 9,
    image: "/product-placeholder.svg",
    gallery: ["/product-placeholder.svg"],
    specifications: {
      Storage: "1TB SSD",
      OpticalDrive: "Ultra HD Blu-ray",
      Connectivity: "Wi-Fi 6",
    },
    warranty: "Garansi toko 12 bulan",
    sku: "PS5-SLIM-DISC",
    weight: 3.2,
    trade_in: true,
    free_shipping: true,
    featured: true,
    best_selling: true,
    created_at: "2026-03-15T09:00:00.000Z",
    reviews: [
      {
        id: "review-ps5-1",
        rating: 5,
        comment: "Packing aman dan konsol mulus.",
        created_at: "2026-03-18T11:00:00.000Z",
        user: { name: "Guntur" },
      },
      {
        id: "review-ps5-2",
        rating: 4,
        comment: "Setup cepat, loading jauh lebih singkat dibanding PS4.",
        created_at: "2026-03-21T10:10:00.000Z",
        user: { name: "Aldo" },
      },
    ],
  },
  {
    id: "prod-switch-oled",
    name: "Nintendo Switch OLED White",
    slug: "nintendo-switch-oled-white",
    description: "Hybrid console dengan layar OLED cerah untuk portable maupun docked.",
    category: getCategory("gaming-console"),
    brand: getBrand("nintendo"),
    entraverse_price: 4399000,
    offline_price: 4599000,
    original_price: 4799000,
    rating: 4.8,
    sold_count: 47,
    stock: 14,
    image: "/product-placeholder.svg",
    gallery: ["/product-placeholder.svg"],
    specifications: {
      Display: "7-inch OLED",
      Storage: "64GB",
      Battery: "4.5 - 9 hours",
    },
    warranty: "Garansi toko 6 bulan",
    sku: "NSW-OLED-WHT",
    weight: 0.42,
    trade_in: true,
    free_shipping: true,
    created_at: "2026-03-10T09:00:00.000Z",
    reviews: [
      {
        id: "review-switch-1",
        rating: 5,
        comment: "Panel OLED bikin warna game kelihatan lebih hidup.",
        created_at: "2026-03-12T09:20:00.000Z",
        user: { name: "Tio" },
      },
    ],
  },
  {
    id: "prod-xiaomi-tv-stick",
    name: "Xiaomi TV Stick 4K",
    slug: "xiaomi-tv-stick-4k",
    description: "Streaming dongle praktis untuk upgrade TV biasa jadi smart hub.",
    category: getCategory("smart-device"),
    brand: getBrand("xiaomi"),
    entraverse_price: 899000,
    offline_price: 949000,
    original_price: 1099000,
    rating: 4.5,
    sold_count: 115,
    stock: 30,
    image: "/product-placeholder.svg",
    gallery: ["/product-placeholder.svg"],
    specifications: {
      Resolution: "Up to 4K",
      Audio: "Dolby Atmos, DTS HD",
      Memory: "2GB RAM / 8GB storage",
    },
    warranty: "Garansi toko 3 bulan",
    sku: "MI-TV-STICK-4K",
    weight: 0.08,
    free_shipping: true,
    best_selling: true,
    created_at: "2026-03-28T09:00:00.000Z",
    reviews: [
      {
        id: "review-tv-stick-1",
        rating: 4,
        comment: "Cocok untuk Netflix dan YouTube. Install cepat.",
        created_at: "2026-03-30T12:00:00.000Z",
        user: { name: "Lukman" },
      },
    ],
  },
  {
    id: "prod-jbl-bar",
    name: "JBL Cinema SB580 Soundbar",
    slug: "jbl-cinema-sb580-soundbar",
    description: "Soundbar ringkas untuk upgrade audio ruang keluarga.",
    category: getCategory("home-entertainment"),
    brand: getBrand("jbl"),
    entraverse_price: 3299000,
    offline_price: 3499000,
    original_price: 3799000,
    rating: 4.6,
    sold_count: 29,
    stock: 6,
    image: "/product-placeholder.svg",
    gallery: ["/product-placeholder.svg"],
    specifications: {
      Channels: "3.1 channel",
      AudioPower: "440W",
      Connectivity: "HDMI eARC, Bluetooth",
    },
    warranty: "Garansi resmi 12 bulan",
    sku: "JBL-SB580",
    weight: 4.9,
    free_shipping: false,
    featured: true,
    created_at: "2026-03-18T09:00:00.000Z",
    reviews: [
      {
        id: "review-jbl-1",
        rating: 5,
        comment: "Dialog film jauh lebih jelas, bass cukup berasa.",
        created_at: "2026-03-23T18:00:00.000Z",
        user: { name: "Mira" },
      },
    ],
  },
  {
    id: "prod-insta360-x4",
    name: "Insta360 X4 Action Camera",
    slug: "insta360-x4-action-camera",
    description: "Kamera 360 portable untuk travel dan immersive content creation.",
    category: getCategory("smart-device"),
    brand: getBrand("insta360"),
    entraverse_price: 7699000,
    offline_price: 7899000,
    original_price: 8299000,
    rating: 4.7,
    sold_count: 21,
    stock: 7,
    image: "/product-placeholder.svg",
    gallery: ["/product-placeholder.svg"],
    specifications: {
      Video: "8K30 360 video",
      Waterproof: "10m",
      Battery: "2290mAh",
    },
    warranty: "Garansi toko 6 bulan",
    sku: "INSTA360-X4",
    weight: 0.21,
    trade_in: true,
    free_shipping: true,
    created_at: "2026-03-29T09:00:00.000Z",
    reviews: [
      {
        id: "review-x4-1",
        rating: 5,
        comment: "Workflow editing lebih simpel dari dugaan.",
        created_at: "2026-03-31T08:45:00.000Z",
        user: { name: "Nadya" },
      },
    ],
  },
  {
    id: "prod-dualsense",
    name: "DualSense Wireless Controller",
    slug: "dualsense-wireless-controller",
    description: "Controller PS5 original dengan adaptive trigger dan haptic feedback.",
    category: getCategory("accessories"),
    brand: getBrand("sony"),
    entraverse_price: 1089000,
    offline_price: 1129000,
    original_price: 1199000,
    rating: 4.8,
    sold_count: 73,
    stock: 22,
    image: "/product-placeholder.svg",
    gallery: ["/product-placeholder.svg"],
    specifications: {
      Battery: "Built-in rechargeable",
      Connectivity: "USB-C, Bluetooth",
      Features: "Adaptive triggers",
    },
    warranty: "Garansi resmi 6 bulan",
    sku: "DUALSENSE-WHT",
    weight: 0.28,
    free_shipping: true,
    best_selling: true,
    created_at: "2026-03-08T09:00:00.000Z",
    reviews: [
      {
        id: "review-dualsense-1",
        rating: 5,
        comment: "Original dan vibration-nya mantap.",
        created_at: "2026-03-09T09:00:00.000Z",
        user: { name: "Edo" },
      },
    ],
  },
];

const parseNumber = (value: string | null | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOptionalNumber = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBoolean = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
};

const parseCsvValues = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );

const parseRatingValues = (values: string[]): number[] =>
  Array.from(
    new Set(
      values
        .flatMap((value) => value.split(","))
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    )
  );

const buildReviewSummary = (reviews: MockReview[]) => {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  reviews.forEach((review) => {
    const bucket = Math.max(1, Math.min(5, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[bucket] += 1;
  });

  const total = reviews.length;
  const average = total > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / total : 0;

  return {
    average_rating: Number(average.toFixed(1)),
    total_count: total,
    distribution,
  };
};

const toProductRow = (product: MockProduct) => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  description: product.description,
  category: product.category,
  brand: product.brand,
  brand_ref: product.brand,
  entraverse_price: product.entraverse_price,
  offline_price: product.offline_price,
  price: product.entraverse_price,
  original_price: product.original_price,
  discount_percentage:
    product.original_price && product.original_price > product.entraverse_price
      ? Math.round(((product.original_price - product.entraverse_price) / product.original_price) * 100)
      : 0,
  rating: product.rating,
  sold_count: product.sold_count,
  stock: product.stock,
  stock_status: product.stock <= 0 ? "out_of_stock" : product.stock <= 5 ? "low_stock" : "in_stock",
  image: product.image,
  main_image: product.image,
  gallery: product.gallery,
  photos: product.gallery.map((url) => ({ url })),
  specifications: product.specifications,
  specs: product.specifications,
  warranty: product.warranty,
  sku: product.sku,
  weight: product.weight,
  trade_in: product.trade_in ?? false,
  free_shipping: product.free_shipping ?? true,
  featured: product.featured ?? false,
  best_selling: product.best_selling ?? false,
  active: product.active ?? true,
  created_at: product.created_at,
  variant_pricing: product.variant_pricing ?? [],
  reviews_summary: buildReviewSummary(product.reviews),
});

const sortProducts = (products: MockProduct[], sortBy: SortBy): MockProduct[] => {
  const sorted = [...products];

  sorted.sort((left, right) => {
    switch (sortBy) {
      case "price_asc":
        return left.entraverse_price - right.entraverse_price;
      case "price_desc":
        return right.entraverse_price - left.entraverse_price;
      case "newest":
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      case "rating":
        return right.rating - left.rating || right.sold_count - left.sold_count;
      case "popular":
      default:
        return right.sold_count - left.sold_count || right.rating - left.rating;
    }
  });

  return sorted;
};

export const listMockProducts = (query: ProductQuery = {}) => {
  const {
    search,
    categories = [],
    brands = [],
    ratings = [],
    priceMin,
    priceMax,
    tradeIn,
    bestSelling,
    featured,
    onlyActive,
    sortBy = "popular",
    page = 1,
    perPage = 12,
  } = query;

  let items = [...MOCK_PRODUCTS];

  if (onlyActive) {
    items = items.filter((product) => product.active !== false);
  }

  if (search) {
    const keyword = search.toLowerCase();
    items = items.filter((product) =>
      [product.name, product.slug, product.description, product.brand.name, product.category.name]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }

  if (categories.length > 0) {
    items = items.filter((product) =>
      categories.some((value) =>
        [product.category.id, product.category.slug, product.category.name.toLowerCase()].includes(value.toLowerCase())
      )
    );
  }

  if (brands.length > 0) {
    items = items.filter((product) =>
      brands.some((value) =>
        [product.brand.id, product.brand.slug, product.brand.name.toLowerCase()].includes(value.toLowerCase())
      )
    );
  }

  if (ratings.length > 0) {
    items = items.filter((product) => ratings.includes(Math.floor(product.rating)));
  }

  if (priceMin !== null && priceMin !== undefined) {
    items = items.filter((product) => product.entraverse_price >= priceMin);
  }

  if (priceMax !== null && priceMax !== undefined) {
    items = items.filter((product) => product.entraverse_price <= priceMax);
  }

  if (tradeIn) {
    items = items.filter((product) => product.trade_in);
  }

  if (bestSelling) {
    items = items.filter((product) => product.best_selling);
  }

  if (featured) {
    items = items.filter((product) => product.featured);
  }

  items = sortProducts(items, sortBy);

  const safePerPage = Math.max(1, perPage);
  const safePage = Math.max(1, page);
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / safePerPage));
  const normalizedPage = Math.min(safePage, lastPage);
  const start = (normalizedPage - 1) * safePerPage;

  return {
    success: true,
    data: items.slice(start, start + safePerPage).map(toProductRow),
    meta: {
      current_page: normalizedPage,
      last_page: lastPage,
      total,
      per_page: safePerPage,
    },
  };
};

export const getMockProduct = (identifier: string) => {
  const normalized = identifier.trim().toLowerCase();
  const product = MOCK_PRODUCTS.find(
    (item) => item.id.toLowerCase() === normalized || item.slug.toLowerCase() === normalized
  );

  return product ? toProductRow(product) : null;
};

export const listMockCategories = (limit?: number) => {
  const rows = CATEGORIES.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    product_count: MOCK_PRODUCTS.filter((product) => product.category.slug === category.slug).length,
    icon: category.icon,
    icon_url: category.icon,
  }));

  return {
    success: true,
    data: typeof limit === "number" ? rows.slice(0, Math.max(1, limit)) : rows,
    count: rows.length,
  };
};

export const listMockBrands = (limit?: number) => {
  const rows = BRANDS.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    product_count: MOCK_PRODUCTS.filter((product) => product.brand.slug === brand.slug).length,
    logo: brand.logo,
    image: brand.logo,
  }));

  return {
    success: true,
    data: typeof limit === "number" ? rows.slice(0, Math.max(1, limit)) : rows,
    count: rows.length,
  };
};

export const listMockActiveBanners = () => ({
  success: true,
  data: [...MOCK_BANNERS]
    .filter((banner) => banner.is_active)
    .sort((left, right) => left.order - right.order),
  count: MOCK_BANNERS.filter((banner) => banner.is_active).length,
});

export const listMockProductSuggestions = (search: string, limit = 6) => {
  const result = listMockProducts({
    search,
    perPage: Math.max(1, limit),
    page: 1,
    onlyActive: true,
    sortBy: "popular",
  });

  return {
    success: true,
    data: result.data,
    meta: {
      keywords: Array.from(
        new Set(
          result.data.flatMap((product) => [String(product.name), String(product.brand?.name ?? ""), String(product.category?.name ?? "")])
        )
      ).slice(0, 6),
    },
  };
};

export const listMockProductReviews = (
  identifier: string,
  options?: {
    page?: number;
    perPage?: number;
    sort?: "newest" | "highest" | "lowest";
    withPhotos?: boolean;
  }
) => {
  const product = MOCK_PRODUCTS.find((item) => item.id === identifier || item.slug === identifier);
  if (!product) {
    return {
      success: true,
      data: [],
      meta: {
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 0,
        summary: buildReviewSummary([]),
      },
    };
  }

  let reviews = [...product.reviews];

  if (options?.withPhotos) {
    reviews = reviews.filter((review) => Array.isArray(review.photos) && review.photos.length > 0);
  }

  if (options?.sort === "highest") {
    reviews.sort((left, right) => right.rating - left.rating);
  } else if (options?.sort === "lowest") {
    reviews.sort((left, right) => left.rating - right.rating);
  } else {
    reviews.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  }

  const page = Math.max(1, options?.page ?? 1);
  const perPage = Math.max(1, options?.perPage ?? 10);
  const total = reviews.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const normalizedPage = Math.min(page, lastPage);
  const start = (normalizedPage - 1) * perPage;

  return {
    success: true,
    data: reviews.slice(start, start + perPage),
    meta: {
      current_page: normalizedPage,
      last_page: lastPage,
      total,
      per_page: perPage,
      summary: buildReviewSummary(product.reviews),
    },
  };
};

export const toggleMockWishlist = (productId: string) => {
  const product = MOCK_PRODUCTS.find((item) => item.id === productId || item.slug === productId);

  return {
    success: true,
    message: product ? `${product.name} ditambahkan ke wishlist.` : "Wishlist diperbarui.",
    is_wishlisted: true,
  };
};

export const addMockCartItem = (payload: {
  productId?: string;
  quantity?: number;
  variant?: Record<string, string>;
}) => {
  const product = payload.productId
    ? MOCK_PRODUCTS.find((item) => item.id === payload.productId || item.slug === payload.productId)
    : null;

  if (!product) {
    return {
      success: false,
      message: "Produk tidak ditemukan.",
      data: null,
    };
  }

  return {
    success: true,
    message: `${product.name} ditambahkan ke keranjang.`,
    data: {
      product_id: product.id,
      quantity: Math.max(1, payload.quantity ?? 1),
      variant: payload.variant ?? null,
    },
  };
};

export const parseMockProductQuery = (searchParams: URLSearchParams): ProductQuery => ({
  search: searchParams.get("search") ?? undefined,
  categories: parseCsvValues(searchParams.getAll("categories").concat(searchParams.getAll("category"))),
  brands: parseCsvValues(searchParams.getAll("brands").concat(searchParams.getAll("brand"))),
  ratings: parseRatingValues(searchParams.getAll("ratings").concat(searchParams.getAll("rating"))),
  priceMin: parseOptionalNumber(searchParams.get("price_min")),
  priceMax: parseOptionalNumber(searchParams.get("price_max")),
  tradeIn: parseBoolean(searchParams.get("trade_in")),
  bestSelling: parseBoolean(searchParams.get("best_selling")),
  featured: parseBoolean(searchParams.get("featured")),
  onlyActive: parseBoolean(searchParams.get("only_active")) || parseBoolean(searchParams.get("apply_visible")),
  sortBy: (searchParams.get("sort_by") ?? searchParams.get("sort") ?? "popular") as SortBy,
  page: parseNumber(searchParams.get("page"), 1),
  perPage: parseNumber(searchParams.get("per_page") ?? searchParams.get("limit"), 12),
});
