export { API_BASE_URL } from "@/lib/api-config";

export const AUTH_ENDPOINTS = {
  login: "/v1/admin/login",
  register: "/v1/admin/register",
  logout: "/v1/admin/logout",
  profile: "/v1/admin/profile",
} as const;

export const CART_ENDPOINTS = {
  list: ["/v1/cart", "/v1/cart/items"] as const,
  add: ["/v1/cart/add", "/v1/cart/items", "/v1/cart"] as const,
  update: (itemId: string) =>
    [`/v1/cart/items/${encodeURIComponent(itemId)}`, `/v1/cart/${encodeURIComponent(itemId)}`] as const,
  updateLegacy: "/v1/cart/update",
  remove: (itemId: string) =>
    [`/v1/cart/items/${encodeURIComponent(itemId)}`, `/v1/cart/${encodeURIComponent(itemId)}`] as const,
  removeLegacy: "/v1/cart/remove",
} as const;

export const SHIPPING_ENDPOINTS = {
  cost: "/shipping/cost",
} as const;

export const CHECKOUT_ENDPOINTS = {
  process: "/checkout/process",
} as const;

export const PRODUCT_ENDPOINTS = {
  list: "/v1/products",
  loadMore: "/v1/products/load-more",
  suggestions: "/v1/products/suggestions",
  detail: (productIdOrSlug: string) => `/v1/products/${encodeURIComponent(productIdOrSlug)}`,
  reviews: (productId: string) => `/v1/products/${encodeURIComponent(productId)}/reviews`,
  categories: "/v1/categories",
  brands: "/v1/brands",
  addToCart: "/v1/cart/add",
  toggleWishlist: (productId: string) => `/v1/wishlist/toggle/${encodeURIComponent(productId)}`,
  adminDelete: (productId: string) => `/v1/admin/products/${encodeURIComponent(productId)}`,
  adminStatus: (productId: string) => `/v1/admin/products/${encodeURIComponent(productId)}/status`,
} as const;

export const TOKEN_KEY = "entraverse_admin_token";
export const USER_KEY = "entraverse_admin_user";
