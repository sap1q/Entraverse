"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Eye,
  GripVertical,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { Banner, BannerReorderItem } from "@/lib/api/types/banner.types";

type BannerStatusFilter = "all" | "active" | "inactive" | "deleted";

type BannerTableProps = {
  banners: Banner[];
  loading: boolean;
  filter: BannerStatusFilter;
  allowReorder?: boolean;
  onEdit: (banner: Banner) => void;
  onDelete: (banner: Banner) => void;
  onRestore: (banner: Banner) => void;
  onForceDelete: (banner: Banner) => void;
  onReorder: (payload: BannerReorderItem[]) => Promise<void> | void;
};

const sortByOrder = (rows: Banner[]) => [...rows].sort((a, b) => a.order - b.order);

const createReorderPayload = (rows: Banner[]): BannerReorderItem[] =>
  rows.map((row, index) => ({
    id: row.id,
    order: index + 1,
  }));

export function BannerTable({
  banners,
  loading,
  filter,
  allowReorder = true,
  onEdit,
  onDelete,
  onRestore,
  onForceDelete,
  onReorder,
}: BannerTableProps) {
  const [rows, setRows] = useState<Banner[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [reorderLoading, setReorderLoading] = useState(false);

  useEffect(() => {
    setRows(sortByOrder(banners));
  }, [banners]);

  const visibleRows = useMemo(() => {
    if (filter === "active") {
      return rows.filter((row) => !row.deleted_at && row.is_active);
    }
    if (filter === "inactive") {
      return rows.filter((row) => !row.deleted_at && !row.is_active);
    }
    if (filter === "deleted") {
      return rows.filter((row) => Boolean(row.deleted_at));
    }
    return rows;
  }, [filter, rows]);

  const totalText = useMemo(() => `${visibleRows.length} banner`, [visibleRows.length]);

  const commitReorder = async (nextRows: Banner[]) => {
    if (!allowReorder) return;

    setRows(nextRows);
    setReorderLoading(true);

    try {
      await onReorder(createReorderPayload(nextRows));
    } finally {
      setReorderLoading(false);
    }
  };

  const moveRow = async (index: number, direction: "up" | "down") => {
    if (!allowReorder) return;

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= visibleRows.length) return;

    const currentId = visibleRows[index]?.id;
    const targetId = visibleRows[target]?.id;
    if (!currentId || !targetId) return;

    const fromIndex = rows.findIndex((row) => row.id === currentId);
    const toIndex = rows.findIndex((row) => row.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextRows = [...rows];
    [nextRows[fromIndex], nextRows[toIndex]] = [nextRows[toIndex], nextRows[fromIndex]];
    await commitReorder(nextRows);
  };

  const dropOnRow = async (targetId: string) => {
    if (!allowReorder) return;
    if (!draggedId || draggedId === targetId) return;

    const currentRows = [...rows];
    const fromIndex = currentRows.findIndex((row) => row.id === draggedId);
    const toIndex = currentRows.findIndex((row) => row.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = currentRows.splice(fromIndex, 1);
    currentRows.splice(toIndex, 0, moved);

    setDraggedId(null);
    await commitReorder(currentRows);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-20 rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (visibleRows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        Belum ada banner.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex items-center justify-end">
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {totalText}
        </span>
      </div>

      {reorderLoading ? (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Menyimpan urutan banner...
        </div>
      ) : null}

      {!allowReorder ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Reorder hanya aktif saat filter <strong>Semua Banner</strong>.
        </div>
      ) : null}

      <table className="w-full min-w-[860px]">
        <thead className="border-y border-slate-200 bg-slate-50">
          <tr>
            <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Preview
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Alt Text
            </th>
            <th className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>
            <th className="w-52 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Aksi
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {visibleRows.map((banner, index) => (
            <tr
              key={banner.id}
              draggable={allowReorder && !banner.deleted_at}
              onDragStart={() => setDraggedId(banner.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                void dropOnRow(banner.id);
              }}
              className="hover:bg-slate-50"
            >
              <td className="px-4 py-3">
                <button
                  type="button"
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
                    allowReorder
                      ? "cursor-move text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      : "cursor-not-allowed text-slate-300"
                  }`}
                  title="Drag untuk ubah urutan"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </td>

              <td className="px-4 py-3">
                <div className="aspect-[2/1] w-40 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.image_url}
                    alt={banner.alt_text || "Banner preview"}
                    className="h-full w-full object-contain"
                  />
                </div>
              </td>

              <td className="px-4 py-3 text-sm text-slate-700">
                {banner.alt_text?.trim() || "Tanpa teks"}
              </td>

              <td className="px-4 py-3">
                {banner.deleted_at ? (
                  <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                    Terhapus
                  </span>
                ) : banner.is_active ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    Aktif
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    Nonaktif
                  </span>
                )}
              </td>

              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {!banner.deleted_at && allowReorder ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          void moveRow(index, "up");
                        }}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title="Naikkan urutan"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void moveRow(index, "down");
                        }}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title="Turunkan urutan"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => window.open(banner.image_url, "_blank", "noopener,noreferrer")}
                    className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
                    title="Lihat preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {!banner.deleted_at ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(banner)}
                        className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"
                        title="Edit banner"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(banner)}
                        className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                        title="Hapus banner"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onRestore(banner)}
                        className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"
                        title="Restore banner"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onForceDelete(banner)}
                        className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                        title="Hapus permanen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
