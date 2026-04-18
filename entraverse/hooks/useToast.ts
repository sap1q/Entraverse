"use client";

import { useCallback, useState } from "react";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
};

const createToastId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = createToastId();
    setToasts((prev) => [...prev, { ...item, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((entry) => entry.id !== id));
    }, 2500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
