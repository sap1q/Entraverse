<?php
declare(strict_types=1);
namespace App\Actions\Checkout;
use App\Jobs\SyncSalesInvoiceToJurnalJob;
use App\Models\SalesOrder;
use App\Services\InvoiceSyncService;
use App\Services\StockService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
class HandlePaymentCallbackAction
{
    public function __construct(
        private readonly InvoiceSyncService $invoiceSync,
        private readonly StockService $stockService,
    ) {
    }
public function execute(array $payload): SalesOrder
    {
        $orderId = trim((string) ($payload['order_id'] ?? ''));
        if ($orderId === '') {
            throw new RuntimeException('order_id callback Midtrans tidak valid.');
        }

        $status = Str::lower(trim((string) ($payload['transaction_status'] ?? '')));
        $fraudStatus = Str::lower(trim((string) ($payload['fraud_status'] ?? '')));
        $paymentType = trim((string) ($payload['payment_type'] ?? ''));
        $shouldDeductStock = false;

        $order = DB::transaction(function () use ($orderId, $status, $fraudStatus, $paymentType, $payload, &$shouldDeductStock): SalesOrder {
            $order = SalesOrder::query()
                ->where('order_number', $orderId)
                ->orWhere('payment_reference', $orderId)
                ->lockForUpdate()
                ->first();

            if (! $order) {
                throw new RuntimeException('Order tidak ditemukan untuk callback Midtrans.');
            }

            $isAlreadySettled = Str::lower((string) $order->payment_status) === 'settlement';
            $isSettlement = $this->isSettlementStatus($status, $fraudStatus);

            $mergedPayload = $this->mergePaymentPayload($order->payment_payload, [
                'callback' => $payload,
            ]);

            $order->payment_method = $paymentType !== '' ? $paymentType : ($order->payment_method ?? 'midtrans_snap');
            $order->payment_payload = $mergedPayload;

            if ($isSettlement) {
                $order->payment_status = 'settlement';
                $order->settled_at = $this->resolveSettlementDate($payload) ?? now();

                if (! in_array((string) $order->status, ['diproses', 'dikirim', 'terkirim', 'selesai'], true)) {
                    $order->status = 'dibayar';
                }

                $metadata = is_array($order->shipping_metadata) ? $order->shipping_metadata : [];
                $hasDeductedStock = is_string($metadata['stock_deducted_at'] ?? null) && trim((string) $metadata['stock_deducted_at']) !== '';

                if (! $isAlreadySettled && ! $hasDeductedStock) {
                    $this->stockService->deductOnSettlement($order);
                    $shouldDeductStock = true;
                }
            } elseif ($status === 'pending') {
                if (! $isAlreadySettled) {
                    $order->payment_status = 'pending';
                }
            } else {
                if (! $isAlreadySettled) {
                    $order->payment_status = $status !== '' ? $status : 'failed';
                    $order->status = 'dibatalkan';
                }
            }

            $order->save();
            $this->invoiceSync->sync($order, $payload);

            return $order->fresh(['items.product', 'invoice']);
        });

        if ($shouldDeductStock) {
            SyncSalesInvoiceToJurnalJob::dispatch((string) $order->id);
        }

        return $order;
    }
private function mergePaymentPayload(?array $existing, array $incoming): array
    {
        $base = is_array($existing) ? $existing : [];

        return array_replace_recursive($base, $incoming);
    }

private function resolveSettlementDate(array $payload): ?Carbon
    {
        $candidates = [
            $payload['settlement_time'] ?? null,
            $payload['transaction_time'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (! is_string($candidate) || trim($candidate) === '') {
                continue;
            }

            try {
                return Carbon::parse($candidate);
            } catch (\Throwable) {
                continue;
            }
        }

        return null;
    }

private function isSettlementStatus(string $status, string $fraudStatus): bool
    {
        if (! in_array($status, ['settlement', 'capture'], true)) {
            return false;
        }

        if ($fraudStatus === '') {
            return true;
        }

        return $fraudStatus === 'accept';
    }

}
