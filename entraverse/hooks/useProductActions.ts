"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "@/lib/api/product";
import { useToast, type ToastItem } from "@/hooks/useToast";

type UseProductActionsOptions = {
  onDeleted?: () => void | Promise<void>;
};

export interface UseProductActionsReturn {
  handleEdit: (id: string) => void;
  handleDelete: (id: string) => Promise<void>;
  deleteLoading: boolean;
  deleteError: string | null;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
}

export const useProductActions = ({ onDeleted }: UseProductActionsOptions = {}): UseProductActionsReturn => {
  const router = useRouter();
  const { toast, toasts, dismiss } = useToast();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/admin/master-produk/${id}/edit`);
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleteLoading(true);
      setDeleteError(null);

      try {
        await deleteProduct(id);
        toast({
          title: "Berhasil",
          description: "Produk berhasil dihapus.",
          variant: "success",
        });
        await onDeleted?.();
      } catch (error) {
        const status = typeof error === "object" && error !== null && "status" in error
          ? Number((error as { status?: unknown }).status)
          : undefined;
        const message = error instanceof Error ? error.message : "Gagal menghapus produk.";

        if (status === 404) {
          toast({
            title: "Info",
            description: "Produk sudah tidak tersedia. Data akan disegarkan.",
            variant: "default",
          });
          await onDeleted?.();
          return;
        }

        const detail =
          status === undefined
            ? "Gangguan jaringan terdeteksi. Periksa koneksi lalu coba lagi."
            : message;

        setDeleteError(detail);
        toast({
          title: "Gagal",
          description: `${detail} Silakan coba lagi untuk retry.`,
          variant: "destructive",
        });
        throw error instanceof Error ? error : new Error(detail);
      } finally {
        setDeleteLoading(false);
      }
    },
    [onDeleted, toast]
  );

  return {
    handleEdit,
    handleDelete,
    deleteLoading,
    deleteError,
    toasts,
    dismissToast: dismiss,
  };
};
