<?php
declare(strict_types=1);
namespace App\Actions\Checkout;
use App\Models\SalesOrder;
use App\Services\MidtransService;
use Illuminate\Support\Str;
class SyncPaymentStatusAction
{
    public function __construct(
        private readonly MidtransService $midtrans,
        private readonly HandlePaymentCallbackAction $handleCallback,
    ) {
    }
public function execute(SalesOrder $order): SalesOrder
    {
        $order->loadMissing(['items.product', 'invoice']);

        $currentPaymentStatus = Str::lower(trim((string) ($order->payment_status ?? 'pending')));
        if (! in_array($currentPaymentStatus, ['pending', 'unfinish', 'challenge'], true)) {
            return $order->fresh(['items.product', 'invoice']) ?? $order;
        }

        $lookupOrderId = trim((string) ($order->order_number ?: $order->payment_reference ?: ''));
        if ($lookupOrderId === '') {
            return $order->fresh(['items.product', 'invoice']) ?? $order;
        }

        $payload = $this->midtrans->getTransactionStatus($lookupOrderId);
        if (! is_array($payload) || trim((string) ($payload['transaction_status'] ?? '')) === '') {
            return $order->fresh(['items.product', 'invoice']) ?? $order;
        }

        if (trim((string) ($payload['order_id'] ?? '')) === '') {
            $payload['order_id'] = $lookupOrderId;
        }

        return $this->handleCallback->execute($payload);
    }
}