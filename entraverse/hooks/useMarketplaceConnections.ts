"use client";

import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "@/lib/axios";
import {
  getMarketplaceConnections,
  type MarketplaceChannel,
  type MarketplaceConnection,
} from "@/lib/api/marketplace-integrations";

type MarketplaceConnectionsState = {
  connections: Record<MarketplaceChannel, MarketplaceConnection>;
  supported: boolean;
  message: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const defaultConnection = (channel: MarketplaceChannel): MarketplaceConnection => ({
  channel,
  status: "disconnected",
  connected: false,
  shopId: null,
  shopName: null,
  sellerId: null,
  authorizationUrl: null,
  connectedAt: null,
  expiresAt: null,
  lastInboundSyncAt: null,
  lastOutboundSyncAt: null,
  lastError: null,
});

const INITIAL_CONNECTIONS: Record<MarketplaceChannel, MarketplaceConnection> = {
  tiktok: defaultConnection("tiktok"),
  shopee: defaultConnection("shopee"),
};

export function useMarketplaceConnections(): MarketplaceConnectionsState {
  const [connections, setConnections] = useState(INITIAL_CONNECTIONS);
  const [supported, setSupported] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getMarketplaceConnections();
        if (!active) return;

        setConnections(result.connections);
        setSupported(result.supported);
        setMessage(result.message);
      } catch (loadError) {
        if (!active) return;

        const message =
          (isAxiosError(loadError) &&
            typeof loadError.response?.data?.message === "string" &&
            loadError.response.data.message) ||
          (loadError instanceof Error ? loadError.message : "Gagal memuat status koneksi marketplace.");

        setError(message);
        setConnections(INITIAL_CONNECTIONS);
        setSupported(false);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadTick]);

  const refresh = useCallback(() => {
    setReloadTick((previous) => previous + 1);
  }, []);

  return {
    connections,
    supported,
    message,
    loading,
    error,
    refresh,
  };
}
