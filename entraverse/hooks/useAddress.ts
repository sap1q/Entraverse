"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "@/lib/axios";
import { userAddressApi } from "@/lib/api/user-address";
import { hasStorefrontSession } from "@/src/lib/auth/access";
import type { UserAddress, UserAddressPayload } from "@/lib/api/types/user-address.types";

type AddressSnapshot = {
  addresses: UserAddress[];
  selectedAddressId: string | null;
  isLoaded: boolean;
};

type Subscriber = (snapshot: AddressSnapshot) => void;

const addressSubscribers = new Set<Subscriber>();

let addressSnapshot: AddressSnapshot = {
  addresses: [],
  selectedAddressId: null,
  isLoaded: false,
};

let fetchPromise: Promise<UserAddress[]> | null = null;

const resolveSelectedAddressId = (addresses: UserAddress[], fallbackId?: string | null): string | null => {
  if (addresses.length === 0) return null;

  if (fallbackId && addresses.some((item) => item.id === fallbackId)) {
    return fallbackId;
  }

  return addresses.find((item) => item.is_main)?.id ?? addresses[0]?.id ?? null;
};

const pushSnapshot = (snapshot: AddressSnapshot) => {
  addressSnapshot = snapshot;
  addressSubscribers.forEach((subscriber) => subscriber(addressSnapshot));
};

const updateSnapshot = (addresses: UserAddress[], selectedAddressId?: string | null) => {
  pushSnapshot({
    addresses,
    selectedAddressId: resolveSelectedAddressId(addresses, selectedAddressId),
    isLoaded: true,
  });
};

const mapMainAddress = (addresses: UserAddress[], selectedId: string): UserAddress[] => {
  return addresses.map((item) => ({
    ...item,
    is_default: item.id === selectedId,
    is_main: item.id === selectedId,
  }));
};

const upsertAddress = (addresses: UserAddress[], incoming: UserAddress): UserAddress[] => {
  const next = addresses.some((item) => item.id === incoming.id)
    ? addresses.map((item) => (item.id === incoming.id ? incoming : item))
    : [incoming, ...addresses];

  if (incoming.is_default) {
    return next.map((item) =>
      item.id === incoming.id
        ? { ...item, is_default: true, is_main: true }
        : { ...item, is_default: false, is_main: false }
    );
  }

  return next;
};

const getErrorMessage = (error: unknown): string => {
  if (!isAxiosError(error)) return "Gagal memuat alamat.";
  if (error.response?.status === 401) return "Silakan login untuk melihat alamat pengiriman.";
  const message = error.response?.data?.message;
  return typeof message === "string" && message.trim().length > 0 ? message : "Terjadi kesalahan pada data alamat.";
};

export const useAddress = () => {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subscriber: Subscriber = (snapshot) => {
      setAddresses(snapshot.addresses);
      setSelectedAddressId(snapshot.selectedAddressId);
      setIsLoaded(snapshot.isLoaded);
    };

    subscriber(addressSnapshot);
    addressSubscribers.add(subscriber);

    return () => {
      addressSubscribers.delete(subscriber);
    };
  }, []);

  const fetchAddresses = useCallback(
    async (options?: { force?: boolean; silent?: boolean }) => {
      const force = options?.force ?? false;
      const silent = options?.silent ?? false;

      if (!hasStorefrontSession()) {
        if (!silent) {
          setLoading(false);
        }
        setError(null);
        return;
      }

      if (!force && addressSnapshot.isLoaded) {
        return;
      }

      if (fetchPromise) {
        if (!silent) {
          setLoading(true);
        }

        try {
          const rows = await fetchPromise;
          updateSnapshot(rows, resolveSelectedAddressId(rows));
        } catch (fetchError) {
          setError(getErrorMessage(fetchError));
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
        return;
      }

      if (!silent) {
        setLoading(true);
      }
      setError(null);

      fetchPromise = userAddressApi.getAll();

      try {
        const rows = await fetchPromise;
        updateSnapshot(rows, resolveSelectedAddressId(rows));
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        fetchPromise = null;
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (addressSnapshot.isLoaded) return;
    void fetchAddresses({ silent: true });
  }, [fetchAddresses]);

  const setMainAddress = useCallback(async (addressId: string) => {
    if (!hasStorefrontSession()) {
      return { success: false as const, message: "Silakan login sebagai user untuk mengatur alamat." };
    }

    const trimmedId = addressId.trim();
    if (!trimmedId || trimmedId === addressSnapshot.selectedAddressId) {
      return { success: true as const };
    }

    const previousSnapshot = addressSnapshot;
    const optimisticAddresses = mapMainAddress(previousSnapshot.addresses, trimmedId);
    updateSnapshot(optimisticAddresses, trimmedId);

    setSavingId(trimmedId);
    setError(null);

    try {
      await userAddressApi.setMain(trimmedId);
      return { success: true as const };
    } catch (saveError) {
      pushSnapshot(previousSnapshot);
      const message = getErrorMessage(saveError);
      setError(message);
      return { success: false as const, message };
    } finally {
      setSavingId(null);
    }
  }, []);

  const removeAddress = useCallback(async (addressId: string) => {
    if (!hasStorefrontSession()) {
      return { success: false as const, message: "Silakan login sebagai user untuk menghapus alamat." };
    }

    const trimmedId = addressId.trim();
    if (!trimmedId) {
      return { success: false as const, message: "Alamat tidak valid." };
    }

    const previousSnapshot = addressSnapshot;
    const nextAddresses = previousSnapshot.addresses.filter((item) => item.id !== trimmedId);
    const nextSelectedId = resolveSelectedAddressId(nextAddresses);

    updateSnapshot(nextAddresses, nextSelectedId);
    setError(null);
    setSavingId(trimmedId);

    try {
      await userAddressApi.remove(trimmedId);
      return { success: true as const };
    } catch (removeError) {
      pushSnapshot(previousSnapshot);
      const message = getErrorMessage(removeError);
      setError(message);
      return { success: false as const, message };
    } finally {
      setSavingId(null);
    }
  }, []);

  const createAddress = useCallback(async (payload: UserAddressPayload) => {
    if (!hasStorefrontSession()) {
      const message = "Silakan login sebagai user untuk menambah alamat.";
      setError(message);
      return { success: false as const, message };
    }

    setError(null);
    try {
      const created = await userAddressApi.create(payload);
      const nextAddresses = upsertAddress(addressSnapshot.addresses, created);
      updateSnapshot(nextAddresses, resolveSelectedAddressId(nextAddresses, created.id));
      return { success: true as const, data: created };
    } catch (createError) {
      const message = getErrorMessage(createError);
      setError(message);
      return { success: false as const, message };
    }
  }, []);

  const updateAddress = useCallback(async (addressId: string, payload: UserAddressPayload) => {
    if (!hasStorefrontSession()) {
      const message = "Silakan login sebagai user untuk memperbarui alamat.";
      setError(message);
      return { success: false as const, message };
    }

    setError(null);
    try {
      const updated = await userAddressApi.update(addressId, payload);
      const nextAddresses = upsertAddress(addressSnapshot.addresses, updated);
      updateSnapshot(nextAddresses, resolveSelectedAddressId(nextAddresses, updated.id));
      return { success: true as const, data: updated };
    } catch (updateError) {
      const message = getErrorMessage(updateError);
      setError(message);
      return { success: false as const, message };
    }
  }, []);

  const selectedAddress = useMemo(
    () => addresses.find((item) => item.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  const selectedAddressLocation = useMemo(() => {
    if (!selectedAddress) return null;
    return (
      selectedAddress.subdistrict ??
      selectedAddress.district ??
      selectedAddress.city ??
      selectedAddress.label ??
      selectedAddress.recipient_name
    );
  }, [selectedAddress]);

  return {
    addresses,
    selectedAddress,
    selectedAddressId,
    selectedAddressLocation,
    isLoaded,
    loading,
    savingId,
    error,
    fetchAddresses,
    setMainAddress,
    removeAddress,
    createAddress,
    updateAddress,
  };
};
