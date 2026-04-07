<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\FinanceSummaryReportService;
use App\Services\Mekari\Exceptions\MekariApiException;
use App\Services\WarehouseMovementReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Throwable;

class ReportController extends Controller
{
    public function __construct(
        private readonly FinanceSummaryReportService $financeSummaryReportService,
        private readonly WarehouseMovementReportService $warehouseMovementReportService,
    ) {
    }

    public function financeSummary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ]);

        try {
            $result = $this->financeSummaryReportService->build($validated);

            return response()->json([
                'success' => true,
                'message' => 'Ringkasan keuangan berhasil diambil.',
                'data' => $result['metrics'],
                'meta' => $result['meta'],
            ]);
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi error saat mengambil ringkasan keuangan.',
                'error' => $exception->getMessage(),
            ], 500);
        }
    }

    public function warehouseMovement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'search' => ['nullable', 'string', 'max:255'],
            'warehouse' => ['nullable', 'string', 'max:120'],
        ]);

        try {
            $result = $this->warehouseMovementReportService->build($validated);

            return response()->json([
                'success' => true,
                'message' => 'Pergerakan barang gudang berhasil diambil.',
                'data' => $result['rows'],
                'meta' => $result['meta'],
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'success' => false,
                'message' => 'Konfigurasi Mekari Jurnal belum lengkap.',
                'error' => $exception->getMessage(),
            ], 422);
        } catch (MekariApiException $exception) {
            $fallback = $this->warehouseMovementReportService->buildFallback($validated);

            return response()->json([
                'success' => true,
                'message' => 'Pergerakan barang gudang dimuat dengan fallback karena sinkronisasi Mekari Jurnal sedang bermasalah.',
                'data' => $fallback['rows'],
                'meta' => [
                    ...$fallback['meta'],
                    'warning' => 'Sinkronisasi Mekari Jurnal gagal. Qty keluar sementara menggunakan fallback stok lokal.',
                    'upstream_error' => $exception->getMessage(),
                    'upstream_status' => $exception->getStatusCode(),
                ],
            ]);
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi error saat mengambil pergerakan barang gudang.',
                'error' => $exception->getMessage(),
            ], 500);
        }
    }
}
