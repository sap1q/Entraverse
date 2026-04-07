"use client";

import type { PriceBreakdown } from "@/types/product.types";

const formatRupiah = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

type PriceBreakdownTableProps = {
  breakdown: PriceBreakdown;
};

export default function PriceBreakdownTable({ breakdown }: PriceBreakdownTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <tbody>
          <tr className="border-b"><td className="px-3 py-2">Harga Pokok (IDR)</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.basePrice)}</td></tr>
          <tr className="border-b"><td className="px-3 py-2">Ongkir Air</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.shippingAir)}</td></tr>
          <tr className="border-b"><td className="px-3 py-2">Ongkir Sea</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.shippingSea)}</td></tr>
          <tr className="border-b"><td className="px-3 py-2">Komisi</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.commission)}</td></tr>
          <tr className="border-b"><td className="px-3 py-2">Cashback</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.cashback)}</td></tr>
          <tr className="border-b"><td className="px-3 py-2">Asuransi</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.insurance)}</td></tr>
          <tr className="border-b"><td className="px-3 py-2">Biaya Garansi</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.warrantyCost)}</td></tr>
          <tr className="border-b"><td className="px-3 py-2">Keuntungan Garansi</td><td className="px-3 py-2 text-right text-emerald-700">{formatRupiah(breakdown.warrantyProfit)}</td></tr>
          <tr className="border-b"><td className="px-3 py-2">Biaya Kirim Baru</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.shippingNew)}</td></tr>
          <tr className="border-b bg-slate-50 font-semibold"><td className="px-3 py-2">Total Cost</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.totalCost)}</td></tr>
          <tr className="border-b bg-blue-50 font-semibold"><td className="px-3 py-2">Harga Rekomendasi</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.recommendedPrice)}</td></tr>
          <tr className="border-b"><td className="px-3 py-2">Entraverse</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.platformPrices.entraverse)}</td></tr>
          <tr className="border-b"><td className="px-3 py-2">Tokopedia</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.platformPrices.tokopedia)}</td></tr>
          <tr className="border-b"><td className="px-3 py-2">Shopee</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.platformPrices.shopee)}</td></tr>
          <tr><td className="px-3 py-2">TikTok</td><td className="px-3 py-2 text-right">{formatRupiah(breakdown.platformPrices.tiktok)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
