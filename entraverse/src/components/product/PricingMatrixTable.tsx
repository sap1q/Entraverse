"use client";

import { memo, useMemo, useState } from "react";
import {
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  Grid3x3,
  Package,
  Ship,
  Table,
  TrendingUp,
} from "lucide-react";
import type { MatrixPricing, VariantCombination } from "@/src/types/product";
import { calculateFinalBeli, calculateMargin } from "@/src/utils/product-helpers";

type PricingMatrixTableProps = {
  combinations: VariantCombination[];
  matrixData: Record<string, MatrixPricing>;
  updateMatrixField: (key: string, field: keyof MatrixPricing, value: number | string) => void;
};

const matrixInputBase =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500";
const matrixInputNumberBase = `${matrixInputBase} text-right font-mono`;
const matrixSelectBase = `${matrixInputBase} text-left`;
const matrixStaticBase =
  "h-12 w-full rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-right text-sm font-bold text-blue-700 shadow-sm";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const defaultMatrixRow: MatrixPricing = {
  stock: 0,
  purchasePrice: 0,
  currency: "SGD",
  exchangeRate: 1,
  exchangeValue: 13338,
  shipping: "Laut",
  shippingCost: 0,
  arrivalCost: 0,
  offlinePrice: 0,
  entraversePrice: 0,
  tokopediaPrice: 0,
  shopeePrice: 0,
  skuSeller: "",
  itemWeight: 0,
  avgSalesA: 0,
  stockoutDateA: "-",
  stockoutFactorA: "-",
  avgSalesB: 0,
  stockoutDateB: "-",
  stockoutFactorB: "-",
  avgDailyFinal: 0,
  predictedInitialStock: 0,
  leadTime: 0,
  reorderPoint: 0,
  need15Days: 0,
  inTransitStock: 0,
  nextProcurement: 0,
  procurementStatus: "Normal",
};

function PricingMatrixTable({
  combinations,
  matrixData,
  updateMatrixField,
}: PricingMatrixTableProps) {
  const [activeVariantTab, setActiveVariantTab] = useState<string>("all");
  const [showAllColumns, setShowAllColumns] = useState(false);

  const filteredCombinations = useMemo(() => {
    if (activeVariantTab === "all") return combinations;
    return combinations.filter((combo) => combo.key.includes(activeVariantTab));
  }, [activeVariantTab, combinations]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Harga & Detail Varian</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAllColumns(!showAllColumns)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {showAllColumns ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showAllColumns ? "Sembunyikan Kolom" : "Tampilkan Semua Kolom"}
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setActiveVariantTab("all")}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeVariantTab === "all"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              Semua
            </button>
            {combinations.slice(0, 3).map((combo) => (
              <button
                key={combo.key}
                type="button"
                onClick={() => setActiveVariantTab(combo.key)}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeVariantTab === combo.key
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <Grid3x3 className="h-3.5 w-3.5" />
                {combo.label.length > 12 ? `${combo.label.substring(0, 12)}...` : combo.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Varian</p>
              <p className="text-3xl font-bold text-slate-800">{combinations.length}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Stok</p>
              <p className="text-3xl font-bold text-slate-800">
                {combinations
                  .reduce((sum, combo) => sum + (matrixData[combo.key]?.stock || 0), 0)
                  .toLocaleString("id-ID")}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Rata-rata Harga Beli</p>
              <p className="text-xl font-bold text-slate-800">
                {formatRupiah(
                  combinations.reduce((sum, combo) => {
                    const row = matrixData[combo.key] || defaultMatrixRow;
                    return sum + calculateFinalBeli(row);
                  }, 0) / (combinations.length || 1)
                )}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Perlu Restock</p>
              <p className="text-3xl font-bold text-slate-800">
                {
                  combinations.filter(
                    (combo) => matrixData[combo.key]?.procurementStatus === "Perlu Restock"
                  ).length
                }
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="thin-scrollbar scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[3200px] w-full border-separate border-spacing-x-3 border-spacing-y-3">
          <thead>
            <tr>
              <th className="sticky left-0 z-30 w-[250px] border-r-2 border-slate-100 bg-slate-50 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 shadow-[4px_0_8px_rgba(0,0,0,0.05)]">
                NAMA OPSI
              </th>
              <th
                colSpan={7}
                className="bg-blue-50/50 px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-blue-700"
              >
                <Ship className="mr-1 inline h-4 w-4" /> INFORMASI PEMBELIAN
              </th>
              <th
                colSpan={4}
                className="bg-green-50/50 px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-green-700"
              >
                <DollarSign className="mr-1 inline h-4 w-4" /> HARGA JUAL
              </th>
              <th
                colSpan={3}
                className="bg-amber-50/50 px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-amber-700"
              >
                <Package className="mr-1 inline h-4 w-4" /> INFORMASI DASAR
              </th>
              {(showAllColumns || activeVariantTab !== "all") && (
                <>
                  <th
                    colSpan={3}
                    className="bg-purple-50/50 px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-purple-700"
                  >
                    <Calendar className="mr-1 inline h-4 w-4" /> PERIODE A
                  </th>
                  <th
                    colSpan={3}
                    className="bg-indigo-50/50 px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-indigo-700"
                  >
                    <Calendar className="mr-1 inline h-4 w-4" /> PERIODE B
                  </th>
                  <th
                    colSpan={7}
                    className="bg-rose-50/50 px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-rose-700"
                  >
                    <TrendingUp className="mr-1 inline h-4 w-4" /> PERAMALAN STOK
                  </th>
                </>
              )}
            </tr>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-20 border-r-2 border-slate-100 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500 shadow-[4px_0_8px_rgba(0,0,0,0.05)]">
                Varian
              </th>
              <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Harga Beli</th>
              <th className="w-[100px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Kurs</th>
              <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Nilai Tukar</th>
              <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Pengiriman</th>
              <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Biaya Kirim</th>
              <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Biaya Kedatangan</th>
              <th className="w-[160px] border-r-2 border-slate-100 px-3 py-3 text-left text-xs font-semibold text-blue-600">
                Harga Beli (Rp)
              </th>
              <th className="w-[160px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Offline</th>
              <th className="w-[160px] px-3 py-3 text-left text-xs font-semibold text-blue-600">Entraverse</th>
              <th className="w-[160px] px-3 py-3 text-left text-xs font-semibold text-green-600">Tokopedia</th>
              <th className="w-[160px] px-3 py-3 text-left text-xs font-semibold text-orange-600">Shopee</th>
              <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Stok</th>
              <th className="w-[160px] px-3 py-3 text-left text-xs font-semibold text-slate-500">SKU Penjual</th>
              <th className="w-[120px] border-r-2 border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-500">
                Berat
              </th>
              {(showAllColumns || activeVariantTab !== "all") && (
                <>
                  <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Rata-rata A</th>
                  <th className="w-[150px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Tgl Habis A</th>
                  <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Faktor A</th>
                  <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Rata-rata B</th>
                  <th className="w-[150px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Tgl Habis B</th>
                  <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Faktor B</th>
                  <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Rata Final</th>
                  <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Prediksi Awal</th>
                  <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Lead Time</th>
                  <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-slate-500">ROP</th>
                  <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Kebutuhan 15H</th>
                  <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-slate-500">In Transit</th>
                  <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Pengadaan</th>
                  <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredCombinations.map((combo) => {
              const row: MatrixPricing = {
                ...defaultMatrixRow,
                ...(matrixData[combo.key] ?? {}),
              };
              const purchasePriceIdr = calculateFinalBeli(row);
              const offlineMetrics = calculateMargin(row.offlinePrice, purchasePriceIdr);
              const entraverseMetrics = calculateMargin(row.entraversePrice, purchasePriceIdr);
              const tokopediaMetrics = calculateMargin(row.tokopediaPrice, purchasePriceIdr);
              const shopeeMetrics = calculateMargin(row.shopeePrice, purchasePriceIdr);

              return (
                <tr
                  key={combo.key}
                  className="border-b border-slate-100 align-middle transition-colors hover:bg-blue-50/30"
                >
                  <td className="sticky left-0 z-20 border-r-2 border-slate-100 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-[4px_0_8px_rgba(0,0,0,0.05)]">
                    {combo.label}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="number"
                      className={matrixInputNumberBase}
                      value={row.purchasePrice}
                      placeholder="0"
                      onChange={(event) =>
                        updateMatrixField(combo.key, "purchasePrice", Number(event.target.value))
                      }
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <select
                      className={matrixSelectBase}
                      value={row.currency}
                      onChange={(event) => updateMatrixField(combo.key, "currency", event.target.value)}
                    >
                      <option value="SGD">SGD</option>
                      <option value="USD">USD</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="number"
                      className={matrixInputNumberBase}
                      value={row.exchangeValue}
                      placeholder="0"
                      onChange={(event) =>
                        updateMatrixField(combo.key, "exchangeValue", Number(event.target.value))
                      }
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <select
                      className={matrixSelectBase}
                      value={row.shipping}
                      onChange={(event) => updateMatrixField(combo.key, "shipping", event.target.value)}
                    >
                      <option value="Laut">Laut</option>
                      <option value="Udara">Udara</option>
                      <option value="Darat">Darat</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="number"
                      className={matrixInputNumberBase}
                      value={row.shippingCost}
                      placeholder="0"
                      onChange={(event) =>
                        updateMatrixField(combo.key, "shippingCost", Number(event.target.value))
                      }
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="number"
                      className={matrixInputNumberBase}
                      value={row.arrivalCost}
                      placeholder="0"
                      onChange={(event) =>
                        updateMatrixField(combo.key, "arrivalCost", Number(event.target.value))
                      }
                    />
                  </td>
                  <td className="border-r-2 border-slate-100 px-3 py-2 align-middle">
                    <div className={matrixStaticBase}>{formatRupiah(purchasePriceIdr)}</div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="number"
                      className={`${matrixInputNumberBase} ${
                        !offlineMetrics.isProfit ? "border-red-200 bg-red-50" : ""
                      }`}
                      value={row.offlinePrice}
                      placeholder="0"
                      onChange={(event) =>
                        updateMatrixField(combo.key, "offlinePrice", Number(event.target.value))
                      }
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <span
                        className={`text-[10px] ${
                          offlineMetrics.isProfit ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {offlineMetrics.margin.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="number"
                      className={`${matrixInputNumberBase} text-blue-700 ${
                        !entraverseMetrics.isProfit ? "border-red-200 bg-red-50" : ""
                      }`}
                      value={row.entraversePrice}
                      placeholder="0"
                      onChange={(event) =>
                        updateMatrixField(combo.key, "entraversePrice", Number(event.target.value))
                      }
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <span
                        className={`text-[10px] ${
                          entraverseMetrics.isProfit ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {entraverseMetrics.margin.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="number"
                      className={`${matrixInputNumberBase} text-green-700 ${
                        !tokopediaMetrics.isProfit ? "border-red-200 bg-red-50" : ""
                      }`}
                      value={row.tokopediaPrice}
                      placeholder="0"
                      onChange={(event) =>
                        updateMatrixField(combo.key, "tokopediaPrice", Number(event.target.value))
                      }
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <span
                        className={`text-[10px] ${
                          tokopediaMetrics.isProfit ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {tokopediaMetrics.margin.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="number"
                      className={`${matrixInputNumberBase} text-orange-700 ${
                        !shopeeMetrics.isProfit ? "border-red-200 bg-red-50" : ""
                      }`}
                      value={row.shopeePrice}
                      placeholder="0"
                      onChange={(event) =>
                        updateMatrixField(combo.key, "shopeePrice", Number(event.target.value))
                      }
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <span
                        className={`text-[10px] ${
                          shopeeMetrics.isProfit ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {shopeeMetrics.margin.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="number"
                      className={matrixInputNumberBase}
                      value={row.stock}
                      placeholder="0"
                      onChange={(event) => updateMatrixField(combo.key, "stock", Number(event.target.value))}
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      className={matrixSelectBase}
                      value={row.skuSeller}
                      onChange={(event) => updateMatrixField(combo.key, "skuSeller", event.target.value)}
                      placeholder="SKU-123"
                    />
                  </td>
                  <td className="border-r-2 border-slate-100 px-3 py-2 align-middle">
                    <input
                      type="number"
                      className={matrixInputNumberBase}
                      value={row.itemWeight}
                      placeholder="0"
                      onChange={(event) =>
                        updateMatrixField(combo.key, "itemWeight", Number(event.target.value))
                      }
                    />
                  </td>
                  {(showAllColumns || activeVariantTab !== "all") && (
                    <>
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="number"
                          placeholder="0"
                          className={matrixInputNumberBase}
                          value={row.avgSalesA}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "avgSalesA", Number(event.target.value))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          placeholder="DD/MM/YYYY"
                          className={matrixSelectBase}
                          value={row.stockoutDateA}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "stockoutDateA", event.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          placeholder="-"
                          className={matrixSelectBase}
                          value={row.stockoutFactorA}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "stockoutFactorA", event.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="number"
                          placeholder="0"
                          className={matrixInputNumberBase}
                          value={row.avgSalesB}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "avgSalesB", Number(event.target.value))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          placeholder="DD/MM/YYYY"
                          className={matrixSelectBase}
                          value={row.stockoutDateB}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "stockoutDateB", event.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          placeholder="-"
                          className={matrixSelectBase}
                          value={row.stockoutFactorB}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "stockoutFactorB", event.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="number"
                          placeholder="0"
                          className={matrixInputNumberBase}
                          value={row.avgDailyFinal}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "avgDailyFinal", Number(event.target.value))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="number"
                          placeholder="0"
                          className={matrixInputNumberBase}
                          value={row.predictedInitialStock}
                          onChange={(event) =>
                            updateMatrixField(
                              combo.key,
                              "predictedInitialStock",
                              Number(event.target.value)
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="number"
                          placeholder="0"
                          className={matrixInputNumberBase}
                          value={row.leadTime}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "leadTime", Number(event.target.value))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="number"
                          placeholder="0"
                          className={matrixInputNumberBase}
                          value={row.reorderPoint}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "reorderPoint", Number(event.target.value))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="number"
                          placeholder="0"
                          className={matrixInputNumberBase}
                          value={row.need15Days}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "need15Days", Number(event.target.value))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="number"
                          placeholder="0"
                          className={matrixInputNumberBase}
                          value={row.inTransitStock}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "inTransitStock", Number(event.target.value))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="number"
                          placeholder="0"
                          className={matrixInputNumberBase}
                          value={row.nextProcurement}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "nextProcurement", Number(event.target.value))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <select
                          className={matrixSelectBase}
                          value={row.procurementStatus}
                          onChange={(event) =>
                            updateMatrixField(combo.key, "procurementStatus", event.target.value)
                          }
                        >
                          <option value="Normal">Normal</option>
                          <option value="Perlu Restock">Restock</option>
                          <option value="Aman">Aman</option>
                        </select>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(showAllColumns || activeVariantTab !== "all") && (
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500"></span>
            <span>Profit</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500"></span>
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono">%</span>
            <span>Margin</span>
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(PricingMatrixTable);

