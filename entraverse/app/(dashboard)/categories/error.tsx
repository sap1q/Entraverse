"use client";

export default function CategoriesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
      <h2 className="text-lg font-bold text-rose-700">Gagal memuat halaman kategori</h2>
      <p className="mt-2 text-sm text-rose-600">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Coba Lagi
      </button>
    </div>
  );
}