import { NextRequest, NextResponse } from "next/server";
import {
  addMockCartItem,
  getMockProduct,
  listMockProductReviews,
  listMockProducts,
  listMockProductSuggestions,
  parseMockProductQuery,
  toggleMockWishlist,
} from "@/lib/mock-store-api";
import {
  buildAdminSessionUser,
  computeBrandProductCount,
  loadAdminState,
  normalizeStoredProduct,
  paginate,
  saveAdminState,
  sortByUpdatedAtDesc,
  uploadAdminAsset,
  type AdminRole,
} from "@/lib/server/admin-store";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

type MockAdmin = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const AUTH_EXPIRES_IN = 60 * 60 * 24 * 7;

const json = (payload: unknown, init?: ResponseInit) => NextResponse.json(payload, init);

const notFound = () =>
  json(
    {
      success: false,
      message: "Endpoint tidak ditemukan.",
    },
    { status: 404 }
  );

const validationError = (message: string, errors: Record<string, string[]>) =>
  json(
    {
      success: false,
      message,
      errors,
      data: null,
    },
    { status: 422 }
  );

const parseNumber = (value: string | null | undefined, fallback = 0): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: string | null | undefined): boolean =>
  value === "1" || value === "true";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const isValidAdminRole = (value: string | null | undefined): value is AdminRole =>
  value === "superadmin" || value === "admin" || value === "staff" || value === "editor";

const normalizeNameFromEmail = (email: string) =>
  email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ") || "Entraverse Admin";

const createMockAdmin = (params: {
  email: string;
  name?: string;
  role?: string | null;
  createdAt?: string;
}): MockAdmin => {
  const normalizedEmail = params.email.trim().toLowerCase();
  const name = params.name?.trim() || normalizeNameFromEmail(normalizedEmail);
  const inferredRole = normalizedEmail.includes("superadmin")
    ? "superadmin"
    : normalizedEmail.includes("staff")
      ? "staff"
      : normalizedEmail.includes("editor")
        ? "editor"
        : "admin";
  const role = isValidAdminRole(params.role) ? params.role : inferredRole;
  const createdAt = params.createdAt ?? "2026-04-01T00:00:00.000Z";
  const now = new Date().toISOString();

  return {
    id: `admin-${Buffer.from(normalizedEmail).toString("base64url").slice(0, 16)}`,
    name,
    email: normalizedEmail,
    role,
    last_login_at: now,
    created_at: createdAt,
    updated_at: now,
  };
};

const encodeMockAdminToken = (admin: MockAdmin) =>
  `mock-admin.${Buffer.from(
    JSON.stringify({
      sub: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      created_at: admin.created_at,
      exp: Date.now() + (AUTH_EXPIRES_IN * 1000),
    })
  ).toString("base64url")}`;

const decodeMockAdminToken = (authorization: string | null): MockAdmin | null => {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token.startsWith("mock-admin.")) {
    return null;
  }

  const encodedPayload = token.slice("mock-admin.".length);

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      sub?: string;
      name?: string;
      email?: string;
      role?: string;
      created_at?: string;
      exp?: number;
    };

    if (!payload.email || !payload.sub || !payload.name || !isValidAdminRole(payload.role)) {
      return null;
    }

    if (typeof payload.exp === "number" && Date.now() > payload.exp) {
      return null;
    }

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      last_login_at: new Date().toISOString(),
      created_at: payload.created_at ?? "2026-04-01T00:00:00.000Z",
      updated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const authResponse = (admin: MockAdmin, message: string) =>
  json({
    success: true,
    message,
    data: {
      token: encodeMockAdminToken(admin),
      token_type: "Bearer" as const,
      admin,
      expires_in: AUTH_EXPIRES_IN,
      refresh_token: `mock-refresh.${admin.id}`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: "blob-v1",
    },
  });

const unauthorized = () =>
  json(
    {
      success: false,
      message: "Sesi tidak valid. Silakan login kembali.",
      data: null,
    },
    { status: 401 }
  );

const assertAdminSession = (request: NextRequest) => decodeMockAdminToken(request.headers.get("authorization"));

const getFiles = (formData: FormData, key: string): File[] =>
  formData.getAll(key).filter((entry): entry is File => entry instanceof File && entry.size > 0);

const respondAdminProfile = (request: NextRequest) => {
  const admin = assertAdminSession(request);
  if (!admin) {
    return unauthorized();
  }

  return json({
    success: true,
    message: "Profil admin berhasil dimuat.",
    data: admin,
    meta: {
      timestamp: new Date().toISOString(),
      version: "blob-v1",
    },
  });
};

const listCategoryRows = async (searchParams: URLSearchParams) => {
  const state = await loadAdminState();
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const page = parseNumber(searchParams.get("page"), 1);
  const perPage = parseNumber(searchParams.get("per_page"), 10);
  const sortBy = searchParams.get("sort_by") ?? "created_at";
  const sortOrder = searchParams.get("sort_order") === "asc" ? "asc" : "desc";
  const minMargin = searchParams.get("min_margin");
  const maxMargin = searchParams.get("max_margin");
  const withTrashed = parseBoolean(searchParams.get("with_trashed"));
  const onlyTrashed = parseBoolean(searchParams.get("only_trashed"));
  const limit = searchParams.get("limit");

  let rows = state.categories.filter((category) => {
    if (onlyTrashed) return Boolean(category.deleted_at);
    if (!withTrashed && category.deleted_at) return false;
    if (search && !category.name.toLowerCase().includes(search)) return false;
    if (minMargin !== null && category.min_margin < parseNumber(minMargin)) return false;
    if (maxMargin !== null && category.min_margin > parseNumber(maxMargin, Number.MAX_SAFE_INTEGER)) return false;
    return true;
  });

  rows = [...rows].sort((left, right) => {
    const multiplier = sortOrder === "asc" ? 1 : -1;
    if (sortBy === "name") return multiplier * left.name.localeCompare(right.name, "id");
    if (sortBy === "min_margin") return multiplier * (left.min_margin - right.min_margin);

    const leftValue = (left as unknown as Record<string, unknown>)[sortBy];
    const rightValue = (right as unknown as Record<string, unknown>)[sortBy];
    const leftTime = new Date(typeof leftValue === "string" || typeof leftValue === "number" ? leftValue : 0).getTime();
    const rightTime = new Date(typeof rightValue === "string" || typeof rightValue === "number" ? rightValue : 0).getTime();
    return multiplier * (leftTime - rightTime);
  });

  const normalized = rows.map((category) => ({
    ...category,
    activity: {
      createdBy: category.created_by,
      updatedBy: category.updated_by,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    },
  }));

  if (limit) {
    const size = parseNumber(limit, normalized.length);
    return json({
      success: true,
      data: normalized.slice(0, size),
      count: normalized.slice(0, size).length,
    });
  }

  const paginated = paginate(normalized, page, perPage);
  return json({
    success: true,
    data: paginated.data,
    pagination: paginated.pagination,
    count: paginated.data.length,
  });
};

const getCategoryById = async (identifier: string) => {
  const state = await loadAdminState();
  const category = state.categories.find((item) => item.id === identifier || item.slug === identifier);
  if (!category) {
    return json(
      { success: false, message: "Kategori tidak ditemukan.", data: null },
      { status: 404 }
    );
  }

  return json({
    success: true,
    data: {
      ...category,
      activity: {
        createdBy: category.created_by,
        updatedBy: category.updated_by,
        createdAt: category.created_at,
        updatedAt: category.updated_at,
      },
    },
  });
};

const listPublicBrands = async (searchParams: URLSearchParams) => {
  const state = await loadAdminState();
  const limit = searchParams.get("limit");
  const rows = state.brands.filter((brand) => brand.is_active && !brand.deleted_at).map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    product_count: computeBrandProductCount(state, brand.id),
    logo: brand.logo_url ?? brand.logo,
  }));

  const sliced = limit ? rows.slice(0, parseNumber(limit, rows.length)) : rows;
  return json({
    success: true,
    data: sliced,
    count: sliced.length,
  });
};

const listAdminBrands = async (searchParams: URLSearchParams) => {
  const state = await loadAdminState();
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const page = parseNumber(searchParams.get("page"), 1);
  const perPage = parseNumber(searchParams.get("per_page"), 20);
  const includeInactive = parseBoolean(searchParams.get("include_inactive"));

  const rows = state.brands
    .filter((brand) => {
      if (brand.deleted_at) return false;
      if (!includeInactive && !brand.is_active) return false;
      if (search && !brand.name.toLowerCase().includes(search) && !brand.slug.toLowerCase().includes(search)) {
        return false;
      }
      return true;
    })
    .map((brand) => ({
      ...brand,
      product_count: computeBrandProductCount(state, brand.id),
    }));

  const paginated = paginate(sortByUpdatedAtDesc(rows), page, perPage);
  return json({
    success: true,
    data: paginated.data,
    meta: paginated.meta,
  });
};

const listActiveBanners = async () => {
  const state = await loadAdminState();
  const rows = state.banners
    .filter((banner) => banner.is_active && !banner.deleted_at)
    .sort((left, right) => left.order - right.order);

  return json({
    success: true,
    data: rows,
    count: rows.length,
  });
};

const listAdminBanners = async (searchParams: URLSearchParams) => {
  const state = await loadAdminState();
  const withTrashed = parseBoolean(searchParams.get("with_trashed"));
  const onlyTrashed = parseBoolean(searchParams.get("only_trashed"));

  const rows = state.banners.filter((banner) => {
    if (onlyTrashed) return Boolean(banner.deleted_at);
    if (!withTrashed && banner.deleted_at) return false;
    return true;
  });

  return json({
    success: true,
    data: [...rows].sort((left, right) => left.order - right.order),
    count: rows.length,
  });
};

const getAdminBanner = async (id: string) => {
  const state = await loadAdminState();
  const banner = state.banners.find((item) => item.id === id);
  if (!banner) {
    return json({ success: false, message: "Banner tidak ditemukan.", data: null }, { status: 404 });
  }
  return json({ success: true, data: banner });
};

const listAdminProducts = async (searchParams: URLSearchParams) => {
  const state = await loadAdminState();
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const status = searchParams.get("status")?.trim().toLowerCase();
  const page = parseNumber(searchParams.get("page"), 1);
  const perPage = parseNumber(searchParams.get("per_page"), 25);

  const rows = state.products.filter((product) => {
    if (product.deleted_at) return false;
    if (status && status !== "all" && product.product_status !== status) return false;
    if (!search) return true;
    const haystack = [
      product.name,
      product.slug,
      product.spu ?? "",
      product.brand ?? "",
      product.category ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });

  const paginated = paginate(sortByUpdatedAtDesc(rows), page, perPage);
  return json({
    success: true,
    data: paginated.data,
    meta: paginated.meta,
  });
};

const getAdminProduct = async (id: string) => {
  const state = await loadAdminState();
  const product = state.products.find((item) => item.id === id || item.slug === id);
  if (!product) {
    return json({ success: false, message: "Produk tidak ditemukan.", data: null }, { status: 404 });
  }
  return json({ success: true, data: product });
};

const getCategoryStats = async () => {
  const state = await loadAdminState();
  const categories = state.categories;
  const active = categories.filter((category) => !category.deleted_at);
  const margins = active.map((category) => category.min_margin);

  return json({
    success: true,
    data: {
      total: categories.length,
      active: active.length,
      deleted: categories.filter((category) => Boolean(category.deleted_at)).length,
      with_icon: active.filter((category) => Boolean(category.icon_url || category.icon_svg || category.icon)).length,
      avg_margin: margins.length > 0 ? Number((margins.reduce((sum, value) => sum + value, 0) / margins.length).toFixed(2)) : 0,
      max_margin: margins.length > 0 ? Math.max(...margins) : 0,
      min_margin: margins.length > 0 ? Math.min(...margins) : 0,
    },
  });
};

const checkCategoryName = async (body: Record<string, unknown>) => {
  const state = await loadAdminState();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const excludeId = typeof body.exclude_id === "string" ? body.exclude_id : "";
  const exists = state.categories.some(
    (category) => category.id !== excludeId && category.name.toLowerCase() === name.toLowerCase()
  );

  return json({
    success: true,
    data: {
      exists,
      message: exists ? "Nama kategori sudah digunakan." : "Nama kategori tersedia.",
    },
  });
};

const createOrUpdateBanner = async (request: NextRequest, bannerId?: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();

  const state = await loadAdminState();
  const formData = await request.formData();
  const existing = bannerId ? state.banners.find((banner) => banner.id === bannerId) : null;
  if (bannerId && !existing) {
    return json({ success: false, message: "Banner tidak ditemukan.", data: null }, { status: 404 });
  }

  const file = formData.get("image");
  let imagePath = existing?.image_path ?? "/assets/images/hero/e-hero.png";
  let imageUrl = existing?.image_url ?? "/assets/images/hero/e-hero.png";

  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadAdminAsset("banners", file);
    imagePath = uploaded.pathname;
    imageUrl = uploaded.url;
  } else if (!existing) {
    return validationError("Data banner tidak valid.", {
      image: ["Gambar banner wajib diunggah."],
    });
  }

  const now = new Date().toISOString();
  const banner = {
    id: existing?.id ?? crypto.randomUUID(),
    title: (formData.get("title") as string | null)?.trim() || null,
    alt_text: (formData.get("alt_text") as string | null)?.trim() || null,
    image_path: imagePath,
    image_url: imageUrl,
    link_url: (formData.get("link_url") as string | null)?.trim() || null,
    order: existing?.order ?? state.banners.length + 1,
    is_active: parseBoolean((formData.get("is_active") as string | null) ?? "0"),
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: existing?.deleted_at ?? null,
  };

  const next = existing
    ? state.banners.map((item) => (item.id === existing.id ? banner : item))
    : [...state.banners, banner];
  await saveAdminState({ ...state, banners: next });

  return json({
    success: true,
    message: existing ? `Banner diperbarui oleh ${admin.name}.` : `Banner dibuat oleh ${admin.name}.`,
    data: banner,
  });
};

const reorderBanners = async (request: NextRequest) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();

  const state = await loadAdminState();
  const body = (await request.json().catch(() => ({}))) as {
    banners?: Array<{ id: string; order: number }>;
  };
  const orderMap = new Map((body.banners ?? []).map((item) => [item.id, item.order]));
  const updatedAt = new Date().toISOString();

  const banners = state.banners.map((banner) =>
    orderMap.has(banner.id)
      ? { ...banner, order: Number(orderMap.get(banner.id)), updated_at: updatedAt }
      : banner
  );
  await saveAdminState({ ...state, banners });

  return json({ success: true, message: `Urutan banner diperbarui oleh ${admin.name}.`, data: null });
};

const softDeleteBanner = async (request: NextRequest, id: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();

  const state = await loadAdminState();
  const banner = state.banners.find((item) => item.id === id);
  if (!banner) return json({ success: false, message: "Banner tidak ditemukan.", data: null }, { status: 404 });

  const deletedAt = new Date().toISOString();
  const banners = state.banners.map((item) =>
    item.id === id ? { ...item, deleted_at: deletedAt, updated_at: deletedAt } : item
  );
  await saveAdminState({ ...state, banners });
  return json({ success: true, message: `Banner dihapus oleh ${admin.name}.`, data: null });
};

const restoreBanner = async (request: NextRequest, id: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();
  const state = await loadAdminState();
  const banner = state.banners.find((item) => item.id === id);
  if (!banner) return json({ success: false, message: "Banner tidak ditemukan.", data: null }, { status: 404 });

  const restored = { ...banner, deleted_at: null, updated_at: new Date().toISOString() };
  const banners = state.banners.map((item) => (item.id === id ? restored : item));
  await saveAdminState({ ...state, banners });
  return json({ success: true, message: `Banner dipulihkan oleh ${admin.name}.`, data: restored });
};

const forceDeleteBanner = async (request: NextRequest, id: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();
  const state = await loadAdminState();
  if (!state.banners.some((item) => item.id === id)) {
    return json({ success: false, message: "Banner tidak ditemukan.", data: null }, { status: 404 });
  }
  await saveAdminState({ ...state, banners: state.banners.filter((item) => item.id !== id) });
  return json({ success: true, message: `Banner dihapus permanen oleh ${admin.name}.`, data: null });
};

const createOrUpdateBrand = async (request: NextRequest, brandId?: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();

  const state = await loadAdminState();
  const formData = await request.formData();
  const existing = brandId ? state.brands.find((brand) => brand.id === brandId) : null;
  if (brandId && !existing) {
    return json({ success: false, message: "Brand tidak ditemukan.", data: null }, { status: 404 });
  }

  const name = (formData.get("name") as string | null)?.trim() || existing?.name || "";
  if (!name) {
    return validationError("Data brand tidak valid.", {
      name: ["Nama brand wajib diisi."],
    });
  }

  let logo = existing?.logo ?? null;
  let logoUrl = existing?.logo_url ?? null;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    const uploaded = await uploadAdminAsset("brands", logoFile);
    logo = uploaded.pathname;
    logoUrl = uploaded.url;
  } else if (parseBoolean((formData.get("remove_logo") as string | null) ?? "0")) {
    logo = null;
    logoUrl = null;
  }

  const now = new Date().toISOString();
  const brand = {
    id: existing?.id ?? crypto.randomUUID(),
    name,
    slug:
      (formData.get("slug") as string | null)?.trim() ||
      existing?.slug ||
      slugify(name),
    logo,
    logo_url: logoUrl,
    description: (formData.get("description") as string | null)?.trim() || null,
    is_active: parseBoolean((formData.get("is_active") as string | null) ?? "1"),
    product_count: existing ? computeBrandProductCount(state, existing.id) : 0,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  };

  const brands = existing
    ? state.brands.map((item) => (item.id === existing.id ? brand : item))
    : [...state.brands, brand];
  await saveAdminState({ ...state, brands });
  return json({ success: true, message: `Brand disimpan oleh ${admin.name}.`, data: brand });
};

const deleteBrand = async (request: NextRequest, id: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();
  const state = await loadAdminState();
  if (!state.brands.some((brand) => brand.id === id)) {
    return json({ success: false, message: "Brand tidak ditemukan.", data: null }, { status: 404 });
  }

  const products = state.products.map((product) =>
    product.brand_id === id
      ? {
          ...product,
          brand_id: null,
          brand: null,
          brand_ref: null,
          updated_at: new Date().toISOString(),
        }
      : product
  );
  await saveAdminState({
    ...state,
    brands: state.brands.filter((brand) => brand.id !== id),
    products,
  });
  return json({ success: true, message: `Brand dihapus oleh ${admin.name}.`, data: null });
};

const createOrUpdateCategory = async (request: NextRequest, categoryId?: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();

  const state = await loadAdminState();
  const formData = await request.formData();
  const existing = categoryId ? state.categories.find((category) => category.id === categoryId) : null;
  if (categoryId && !existing) {
    return json({ success: false, message: "Kategori tidak ditemukan.", data: null }, { status: 404 });
  }

  const name = (formData.get("name") as string | null)?.trim() || existing?.name || "";
  if (!name) {
    return validationError("Data kategori tidak valid.", {
      name: ["Nama kategori wajib diisi."],
    });
  }

  let icon = existing?.icon ?? null;
  let iconUrl = existing?.icon_url ?? null;
  let iconSvg = (formData.get("icon_svg") as string | null)?.trim() || existing?.icon_svg || null;
  const iconFile = formData.get("icon");
  if (iconFile instanceof File && iconFile.size > 0) {
    const uploaded = await uploadAdminAsset("categories", iconFile);
    icon = uploaded.pathname;
    iconUrl = uploaded.url;
    iconSvg = null;
  } else if (parseBoolean((formData.get("remove_icon") as string | null) ?? "0")) {
    icon = null;
    iconUrl = null;
    iconSvg = null;
  }

  const fallbackFees = existing?.fees ?? {
    marketplace: { components: [] },
    shopee: { components: [] },
    entraverse: { components: [] },
    tokopedia: { components: [] },
    tokopedia_tiktok: { components: [] },
  };
  const fees = JSON.parse((formData.get("fees") as string | null) ?? JSON.stringify(fallbackFees)) as typeof fallbackFees;
  const margin = parseNumber((formData.get("margin_percent") as string | null) ?? (formData.get("min_margin") as string | null), existing?.min_margin ?? 0);
  const now = new Date().toISOString();
  const category = {
    id: existing?.id ?? crypto.randomUUID(),
    name,
    slug: existing?.slug ?? slugify(name),
    icon,
    icon_url: iconUrl,
    icon_svg: iconSvg,
    fees,
    program_garansi: (formData.get("program_garansi") as string | null)?.trim() || null,
    margin_percent: margin,
    min_margin: margin,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: existing?.deleted_at ?? null,
    created_by: existing?.created_by ?? admin.name,
    updated_by: admin.name,
  };

  const categories = existing
    ? state.categories.map((item) => (item.id === existing.id ? category : item))
    : [...state.categories, category];
  await saveAdminState({ ...state, categories });
  return json({
    success: true,
    message: `Kategori disimpan oleh ${admin.name}.`,
    data: {
      ...category,
      activity: {
        createdBy: category.created_by,
        updatedBy: category.updated_by,
        createdAt: category.created_at,
        updatedAt: category.updated_at,
      },
    },
  });
};

const softDeleteCategory = async (request: NextRequest, id: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();
  const state = await loadAdminState();
  const category = state.categories.find((item) => item.id === id);
  if (!category) {
    return json({ success: false, message: "Kategori tidak ditemukan.", data: null }, { status: 404 });
  }
  const deletedAt = new Date().toISOString();
  const categories = state.categories.map((item) =>
    item.id === id ? { ...item, deleted_at: deletedAt, updated_at: deletedAt, updated_by: admin.name } : item
  );
  await saveAdminState({ ...state, categories });
  return json({ success: true, message: `Kategori dihapus oleh ${admin.name}.`, data: null });
};

const restoreCategory = async (request: NextRequest, id: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();
  const state = await loadAdminState();
  const category = state.categories.find((item) => item.id === id);
  if (!category) {
    return json({ success: false, message: "Kategori tidak ditemukan.", data: null }, { status: 404 });
  }
  const restored = { ...category, deleted_at: null, updated_at: new Date().toISOString(), updated_by: admin.name };
  await saveAdminState({
    ...state,
    categories: state.categories.map((item) => (item.id === id ? restored : item)),
  });
  return json({ success: true, message: `Kategori dipulihkan oleh ${admin.name}.`, data: restored });
};

const forceDeleteCategory = async (request: NextRequest, id: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();
  const state = await loadAdminState();
  if (!state.categories.some((item) => item.id === id)) {
    return json({ success: false, message: "Kategori tidak ditemukan.", data: null }, { status: 404 });
  }
  const products = state.products.map((product) =>
    product.category_id === id
      ? {
          ...product,
          category_id: null,
          category: null,
          category_ref: null,
          updated_at: new Date().toISOString(),
        }
      : product
  );
  await saveAdminState({
    ...state,
    categories: state.categories.filter((item) => item.id !== id),
    products,
  });
  return json({ success: true, message: `Kategori dihapus permanen oleh ${admin.name}.`, data: null });
};

const bulkDeleteCategories = async (request: NextRequest) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();
  const state = await loadAdminState();
  const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
  const ids = new Set(body.ids ?? []);
  const deletedAt = new Date().toISOString();
  const categories = state.categories.map((category) =>
    ids.has(category.id)
      ? { ...category, deleted_at: deletedAt, updated_at: deletedAt, updated_by: admin.name }
      : category
  );
  await saveAdminState({ ...state, categories });
  return json({ success: true, message: `Kategori dipindahkan ke trash oleh ${admin.name}.`, data: null });
};

const createOrUpdateProduct = async (request: NextRequest, productId?: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();
  const state = await loadAdminState();
  const formData = await request.formData();
  const existing = productId ? state.products.find((product) => product.id === productId) : null;
  if (productId && !existing) {
    return json({ success: false, message: "Produk tidak ditemukan.", data: null }, { status: 404 });
  }

  const uploadedPhotoUrls: string[] = [];
  for (const imageFile of getFiles(formData, "images[]")) {
    const uploaded = await uploadAdminAsset("products", imageFile);
    uploadedPhotoUrls.push(uploaded.url);
  }

  const product = normalizeStoredProduct(state, {
    existing,
    body: formData,
    uploadedPhotoUrls,
  });

  const products = existing
    ? state.products.map((item) => (item.id === existing.id ? product : item))
    : [...state.products, product];
  await saveAdminState({ ...state, products });

  return json({
    success: true,
    message: `Produk disimpan oleh ${admin.name}.`,
    data: product,
  });
};

const deleteProduct = async (request: NextRequest, id: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();
  const state = await loadAdminState();
  if (!state.products.some((product) => product.id === id)) {
    return json({ success: false, message: "Produk tidak ditemukan.", data: null }, { status: 404 });
  }
  await saveAdminState({ ...state, products: state.products.filter((product) => product.id !== id) });
  return json({ success: true, message: `Produk dihapus oleh ${admin.name}.`, data: null });
};

const patchAdminProductStatus = async (request: NextRequest, id: string) => {
  const admin = assertAdminSession(request);
  if (!admin) return unauthorized();
  const state = await loadAdminState();
  const product = state.products.find((item) => item.id === id);
  if (!product) {
    return json({ success: false, message: "Produk tidak ditemukan.", data: null }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: "active" | "inactive" | "draft";
    is_featured?: boolean;
    stock_status?: "in_stock" | "out_of_stock" | "preorder";
  };

  const next = {
    ...product,
    product_status: body.status ?? product.product_status,
    status: body.status ?? product.status,
    is_featured: typeof body.is_featured === "boolean" ? body.is_featured : product.is_featured,
    stock_status: body.stock_status ?? product.stock_status,
    updated_at: new Date().toISOString(),
  };
  await saveAdminState({
    ...state,
    products: state.products.map((item) => (item.id === id ? next : item)),
  });

  return json({ success: true, message: `Status produk diperbarui oleh ${admin.name}.`, data: next });
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const searchParams = request.nextUrl.searchParams;

  if (path.length === 1 && path[0] === "categories") return listCategoryRows(searchParams);
  if (path.length === 2 && path[0] === "categories") return getCategoryById(path[1]);
  if (path.length === 1 && path[0] === "brands") return listPublicBrands(searchParams);
  if (path.length === 2 && path[0] === "banners" && path[1] === "active") return listActiveBanners();
  if (path.length === 2 && path[0] === "admin" && (path[1] === "profile" || path[1] === "user")) return respondAdminProfile(request);
  if (path.length === 2 && path[0] === "admin" && path[1] === "banners") return listAdminBanners(searchParams);
  if (path.length === 3 && path[0] === "admin" && path[1] === "banners") return getAdminBanner(path[2]);
  if (path.length === 2 && path[0] === "admin" && path[1] === "brands") return listAdminBrands(searchParams);
  if (path.length === 2 && path[0] === "admin" && path[1] === "products") return listAdminProducts(searchParams);
  if (path.length === 3 && path[0] === "admin" && path[1] === "products") return getAdminProduct(path[2]);
  if (path.length === 4 && path[0] === "admin" && path[1] === "categories" && path[2] === "stats" && path[3] === "overview") {
    return getCategoryStats();
  }

  if (path.length === 1 && path[0] === "products") {
    return json(listMockProducts(parseMockProductQuery(searchParams)));
  }

  if (path.length === 2 && path[0] === "products" && path[1] === "load-more") {
    return json(listMockProducts(parseMockProductQuery(searchParams)));
  }

  if (path.length === 2 && path[0] === "products" && path[1] === "suggestions") {
    const search = searchParams.get("search") ?? "";
    const limit = Number(searchParams.get("limit") ?? "6");
    return json(listMockProductSuggestions(search, Number.isFinite(limit) ? limit : 6));
  }

  if (path.length === 2 && path[0] === "products") {
    const product = getMockProduct(path[1]);
    if (!product) {
      return json({ success: false, message: "Produk tidak ditemukan." }, { status: 404 });
    }
    return json({ success: true, data: product });
  }

  if (path.length === 3 && path[0] === "products" && path[2] === "reviews") {
    return json(
      listMockProductReviews(path[1], {
        page: Number(searchParams.get("page") ?? "1"),
        perPage: Number(searchParams.get("per_page") ?? "10"),
        sort: (searchParams.get("sort") as "newest" | "highest" | "lowest" | null) ?? "newest",
        withPhotos: searchParams.get("with_photos") === "1",
      })
    );
  }

  return notFound();
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;

  if (path.length === 2 && path[0] === "admin" && path[1] === "login") {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      remember?: boolean;
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const errors: Record<string, string[]> = {};
    if (!email) errors.email = ["Email wajib diisi."];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = ["Format email tidak valid."];
    if (!password) errors.password = ["Password wajib diisi."];
    else if (password.length < 6) errors.password = ["Password minimal 6 karakter."];
    if (Object.keys(errors).length > 0) return validationError("Data login tidak valid.", errors);
    return authResponse(createMockAdmin({ email }), "Login berhasil.");
  }

  if (path.length === 2 && path[0] === "admin" && path[1] === "register") {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const confirmation = body.password_confirmation ?? "";
    const errors: Record<string, string[]> = {};
    if (!body.name?.trim()) errors.name = ["Nama wajib diisi."];
    if (!email) errors.email = ["Email wajib diisi."];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = ["Format email tidak valid."];
    if (!password) errors.password = ["Password wajib diisi."];
    else if (password.length < 8) errors.password = ["Password minimal 8 karakter."];
    if (!confirmation) errors.password_confirmation = ["Konfirmasi password wajib diisi."];
    else if (confirmation !== password) errors.password_confirmation = ["Konfirmasi password tidak cocok."];
    if (body.role && !isValidAdminRole(body.role)) errors.role = ["Role admin tidak valid."];
    if (Object.keys(errors).length > 0) return validationError("Data registrasi tidak valid.", errors);
    return authResponse(createMockAdmin({ email, name: body.name, role: body.role }), "Registrasi admin berhasil.");
  }

  if (path.length === 2 && path[0] === "admin" && path[1] === "logout") {
    return json({ success: true, message: "Logout berhasil.", data: null });
  }

  if (path.length === 2 && path[0] === "admin" && path[1] === "banners") return createOrUpdateBanner(request);
  if (path.length === 3 && path[0] === "admin" && path[1] === "banners" && path[2] === "reorder") return reorderBanners(request);
  if (path.length === 4 && path[0] === "admin" && path[1] === "banners" && path[3] === "restore") return restoreBanner(request, path[2]);
  if (path.length === 3 && path[0] === "admin" && path[1] === "banners") return createOrUpdateBanner(request, path[2]);
  if (path.length === 2 && path[0] === "admin" && path[1] === "brands") return createOrUpdateBrand(request);
  if (path.length === 3 && path[0] === "admin" && path[1] === "brands") return createOrUpdateBrand(request, path[2]);
  if (path.length === 2 && path[0] === "admin" && path[1] === "categories") return createOrUpdateCategory(request);
  if (path.length === 4 && path[0] === "admin" && path[1] === "categories" && path[3] === "restore") return restoreCategory(request, path[2]);
  if (path.length === 4 && path[0] === "admin" && path[1] === "categories" && path[2] === "bulk" && path[3] === "delete") return bulkDeleteCategories(request);
  if (path.length === 4 && path[0] === "admin" && path[1] === "categories" && path[2] === "check" && path[3] === "name") {
    return checkCategoryName((await request.json().catch(() => ({}))) as Record<string, unknown>);
  }
  if (path.length === 3 && path[0] === "admin" && path[1] === "categories") return createOrUpdateCategory(request, path[2]);
  if (path.length === 2 && path[0] === "admin" && path[1] === "products") return createOrUpdateProduct(request);
  if (path.length === 3 && path[0] === "admin" && path[1] === "products") return createOrUpdateProduct(request, path[2]);

  if (path.length === 3 && path[0] === "wishlist" && path[1] === "toggle") {
    return json(toggleMockWishlist(path[2]));
  }

  if (path.length === 2 && path[0] === "cart" && path[1] === "add") {
    const body = (await request.json().catch(() => ({}))) as {
      product_id?: string;
      quantity?: number;
      variant?: Record<string, string>;
    };
    const result = addMockCartItem({
      productId: body.product_id,
      quantity: body.quantity,
      variant: body.variant,
    });
    return json(result, { status: result.success ? 200 : 404 });
  }

  return notFound();
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  if (path.length === 4 && path[0] === "admin" && path[1] === "products" && path[3] === "status") {
    return patchAdminProductStatus(request, path[2]);
  }
  return notFound();
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  if (path.length === 3 && path[0] === "admin" && path[1] === "banners") return softDeleteBanner(request, path[2]);
  if (path.length === 4 && path[0] === "admin" && path[1] === "banners" && path[3] === "force") return forceDeleteBanner(request, path[2]);
  if (path.length === 3 && path[0] === "admin" && path[1] === "brands") return deleteBrand(request, path[2]);
  if (path.length === 3 && path[0] === "admin" && path[1] === "categories") return softDeleteCategory(request, path[2]);
  if (path.length === 4 && path[0] === "admin" && path[1] === "categories" && path[3] === "force") return forceDeleteCategory(request, path[2]);
  if (path.length === 3 && path[0] === "admin" && path[1] === "products") return deleteProduct(request, path[2]);
  return notFound();
}
