"use client";

import api from "@/lib/axios";

type JsonRecord = Record<string, unknown>;

export type MarketplaceChannel = "tiktok" | "shopee";
export type MarketplaceConnectionStatus = "connected" | "disconnected" | "pending" | "expired" | "error";
export type MarketplaceSyncScope = "all" | "products" | "inventory" | "price";

export type MarketplaceConnection = {
  channel: MarketplaceChannel;
  status: MarketplaceConnectionStatus;
  connected: boolean;
  shopId: string | null;
  shopName: string | null;
  sellerId: string | null;
  authorizationUrl: string | null;
  connectedAt: string | null;
  expiresAt: string | null;
  lastInboundSyncAt: string | null;
  lastOutboundSyncAt: string | null;
  lastError: string | null;
};

export type MarketplaceConnectionsResponse = {
  connections: Record<MarketplaceChannel, MarketplaceConnection>;
  supported: boolean;
  message: string | null;
};

export type MarketplaceAuthorizationResult = {
  authorizationUrl: string | null;
  message: string | null;
};

const toObject = (value: unknown): JsonRecord => {
  if (!value || typeof value !== "object") return {};
  return value as JsonRecord;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const toBooleanValue = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "connected";
  }

  return false;
};

const normalizeStatus = (value: unknown, connected: boolean): MarketplaceConnectionStatus => {
  const normalized = (toStringValue(value) ?? "").toLowerCase();

  if (normalized === "connected" || normalized === "active" || normalized === "success") return "connected";
  if (normalized === "pending" || normalized === "authorizing") return "pending";
  if (normalized === "expired") return "expired";
  if (normalized === "error" || normalized === "failed") return "error";
  if (normalized === "disconnected") return "disconnected";

  return connected ? "connected" : "disconnected";
};

const mapConnection = (channel: MarketplaceChannel, raw: unknown): MarketplaceConnection => {
  const row = toObject(raw);
  const hasStoredCredential =
    toBooleanValue(row.connected) ||
    toBooleanValue(row.is_connected) ||
    Boolean(toStringValue(row.access_token) || toStringValue(row.refresh_token));
  const status = normalizeStatus(row.status ?? row.connection_status, hasStoredCredential);

  return {
    channel,
    status,
    connected: status === "connected",
    shopId: toStringValue(row.shop_id) ?? toStringValue(row.shopId),
    shopName: toStringValue(row.shop_name) ?? toStringValue(row.shopName) ?? toStringValue(row.shop),
    sellerId: toStringValue(row.seller_id) ?? toStringValue(row.sellerId) ?? toStringValue(row.merchant_id),
    authorizationUrl:
      toStringValue(row.authorization_url) ??
      toStringValue(row.authorize_url) ??
      toStringValue(row.connect_url),
    connectedAt: toStringValue(row.connected_at) ?? toStringValue(row.authorized_at),
    expiresAt: toStringValue(row.expires_at) ?? toStringValue(row.token_expires_at),
    lastInboundSyncAt:
      toStringValue(row.last_inbound_sync_at) ??
      toStringValue(row.last_pull_at) ??
      toStringValue(row.last_import_at),
    lastOutboundSyncAt:
      toStringValue(row.last_outbound_sync_at) ??
      toStringValue(row.last_push_at) ??
      toStringValue(row.last_sync_at),
    lastError: toStringValue(row.last_error) ?? toStringValue(row.error_message),
  };
};

const normalizeConnectionsPayload = (payload: unknown): MarketplaceConnectionsResponse => {
  const source = toObject(payload);
  const data = toObject(source.data);
  const connectionSource = toObject(data.connections ?? source.connections ?? data);
  const entries = Array.isArray(data.items) ? data.items : Array.isArray(source.items) ? source.items : [];
  const mappedFromEntries = entries.reduce<Record<string, unknown>>((result, item) => {
    const row = toObject(item);
    const key = (toStringValue(row.channel) ?? toStringValue(row.marketplace) ?? "").toLowerCase();
    if (key) result[key] = row;
    return result;
  }, {});

  const mergedSource = {
    ...mappedFromEntries,
    ...connectionSource,
  };

  return {
    connections: {
      tiktok: mapConnection("tiktok", mergedSource.tiktok),
      shopee: mapConnection("shopee", mergedSource.shopee),
    },
    supported:
      Boolean(mergedSource.tiktok || mergedSource.shopee) ||
      toBooleanValue(data.supported) ||
      toBooleanValue(source.supported),
    message: toStringValue(data.message) ?? toStringValue(source.message),
  };
};

const resolveMessage = (payload: unknown): string | null => {
  const source = toObject(payload);
  const data = toObject(source.data);
  return toStringValue(data.message) ?? toStringValue(source.message);
};

const resolveAuthorizationUrl = (payload: unknown): string | null => {
  const source = toObject(payload);
  const data = toObject(source.data);

  return (
    toStringValue(data.authorization_url) ??
    toStringValue(data.authorize_url) ??
    toStringValue(data.connect_url) ??
    toStringValue(source.authorization_url) ??
    toStringValue(source.authorize_url) ??
    toStringValue(source.connect_url)
  );
};

export const getMarketplaceConnections = async (): Promise<MarketplaceConnectionsResponse> => {
  const response = await api.get("/v1/integrations/marketplaces/connections");
  return normalizeConnectionsPayload(response.data);
};

export const beginMarketplaceAuthorization = async (
  channel: MarketplaceChannel,
  redirectPath?: string
): Promise<MarketplaceAuthorizationResult> => {
  const response = await api.post(`/v1/integrations/marketplaces/${channel}/connect`, {
    redirect_path: redirectPath,
  });

  return {
    authorizationUrl: resolveAuthorizationUrl(response.data),
    message: resolveMessage(response.data),
  };
};

export const disconnectMarketplaceConnection = async (channel: MarketplaceChannel): Promise<string | null> => {
  const response = await api.post(`/v1/integrations/marketplaces/${channel}/disconnect`);
  return resolveMessage(response.data);
};

export const requestMarketplaceSync = async (
  channel: MarketplaceChannel,
  scope: MarketplaceSyncScope = "all"
): Promise<string | null> => {
  const response = await api.post(`/v1/integrations/marketplaces/${channel}/sync`, {
    scope,
  });
  return resolveMessage(response.data);
};

export const connectMarketplaceVariant = async (
  channel: MarketplaceChannel,
  payload: {
    productId: string;
    variantId: string;
    sellerSku?: string | null;
  }
): Promise<string | null> => {
  const response = await api.post(`/v1/integrations/marketplaces/${channel}/mappings`, {
    product_id: payload.productId,
    variant_id: payload.variantId,
    seller_sku: payload.sellerSku,
  });
  return resolveMessage(response.data);
};

export const disconnectMarketplaceVariant = async (
  channel: MarketplaceChannel,
  payload: {
    productId: string;
    variantId: string;
  }
): Promise<string | null> => {
  const response = await api.delete(`/v1/integrations/marketplaces/${channel}/mappings`, {
    data: {
      product_id: payload.productId,
      variant_id: payload.variantId,
    },
  });
  return resolveMessage(response.data);
};
