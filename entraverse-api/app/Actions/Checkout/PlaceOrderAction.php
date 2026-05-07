<?php

declare(strict_types=1);

namespace App\Actions\Checkout;

use App\Models\Invoice;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\TradeInTransaction;
use App\Models\User;
use App\Models\UserAddress;
use App\Services\InvoiceSyncService;
use App\Services\MidtransService;
use App\Services\OrderItemPreparer;
use App\Services\RajaOngkirService;
use App\Services\StockService;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PlaceOrderAction
{
    public function __construct(
        private readonly RajaOngkirService $rajaOngkir,
        private readonly MidtransService $midtrans,
        private readonly OrderItemPreparer $preparer,
        private readonly InvoiceSyncService $invoiceSync,
        private readonly StockService $stockService,
    ) {
    }

public function execute(User $user, array $payload): array
    {
        $result = DB::transaction(function () use ($user, $payload): array {
            $itemsPayload = is_array($payload['items'] ?? null) ? $payload['items'] : [];
            if ($itemsPayload === []) {
                throw ValidationException::withMessages([
                    'items' => ['Item checkout wajib diisi.'],
                ]);
            }

            $prepared = $this->preparer->prepare($itemsPayload);
            $purchaseItems = is_array($prepared['purchase_items'] ?? null) ? $prepared['purchase_items'] : [];
            $tradeInItems = is_array($prepared['trade_in_items'] ?? null) ? $prepared['trade_in_items'] : [];
            $tradeInTransactions = $this->resolveTradeInTransactions($user, $tradeInItems);

            if ($purchaseItems === []) {
                if ($tradeInTransactions->isEmpty()) {
                    throw ValidationException::withMessages([
                        'items' => ['Checkout ini tidak memiliki item pembelian maupun pengajuan trade-in yang valid.'],
                    ]);
                }

                $tradeInTransactions->each(function (TradeInTransaction $transaction): void {
                    $transaction->sales_order_id = null;
                    $transaction->trade_in_only = true;
                    $transaction->save();
                });

                return [
                    'kind' => 'trade_in',
                    'requires_payment' => false,
                    'order_id' => null,
                    'trade_in_transactions' => $tradeInTransactions->values()->all(),
                    'shipping' => null,
                    'shipping_weight' => 0,
                    'items' => [],
                ];
            }

            $addressId = trim((string) ($payload['address_id'] ?? ''));
            if ($addressId === '') {
                throw ValidationException::withMessages([
                    'address_id' => ['Alamat pengiriman wajib dipilih untuk checkout produk baru.'],
                ]);
            }

            $address = UserAddress::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->whereKey($addressId)
                ->first();

            if (! $address) {
                throw ValidationException::withMessages([
                    'address_id' => ['Alamat pengiriman tidak ditemukan.'],
                ]);
            }

            $courier = Str::lower(trim((string) ($payload['courier'] ?? '')));
            if ($courier === '') {
                throw ValidationException::withMessages([
                    'courier' => ['Kurir wajib dipilih untuk checkout produk baru.'],
                ]);
            }

            $shippingDestination = $this->resolveShippingDestinationFromAddress($address);
            $destinationCityId = $shippingDestination['city_id'];
            $destinationDistrictId = $shippingDestination['district_id'];
            $shippingOrigin = $this->rajaOngkir->getShippingOrigin();
            $shippingServices = $this->rajaOngkir->getShippingCost(
                destinationCityId: $destinationCityId,
                weight: (int) ($prepared['weight'] ?? 0),
                courier: $courier,
                destinationDistrictId: $destinationDistrictId
            );
            $selectedService = $this->resolveShippingService(
                $shippingServices,
                trim((string) ($payload['service'] ?? ''))
            );

            $shippingCost = (float) $selectedService['cost'];
            $subtotal = (float) ($prepared['subtotal'] ?? 0);
            $requestedTradeInDiscount = $tradeInTransactions->isNotEmpty()
                ? max(0.0, (float) ($payload['trade_in_discount'] ?? 0))
                : 0.0;
            $tradeInDiscount = min($requestedTradeInDiscount, $subtotal);
            $totalAmount = max(0.0, ($subtotal - $tradeInDiscount) + $shippingCost);
            $requiresPayment = $totalAmount > 0.0;
            $orderNumber = $this->generateOrderNumber();

            $order = SalesOrder::query()->create([
                'order_number' => $orderNumber,
                'user_id' => (string) $user->id,
                'customer_name' => (string) $address->recipient_name,
                'customer_phone' => $address->recipient_phone,
                'customer_email' => $user->email,
                'customer_address' => $address->full_address ?? $this->composeAddressText($address),
                'status' => 'dibayar',
                'currency' => 'IDR',
                'subtotal' => $subtotal,
                'shipping_cost' => $shippingCost,
                'discount_amount' => $tradeInDiscount,
                'total_amount' => $totalAmount,
                'notes' => $payload['notes'] ?? null,
                'payment_method' => $requiresPayment ? 'midtrans_snap' : 'trade_in_review',
                'payment_status' => $requiresPayment ? 'pending' : 'paid',
                'payment_reference' => $orderNumber,
                'settled_at' => $requiresPayment ? null : now(),
                'shipping_courier' => $courier,
                'shipping_service' => $selectedService['service'],
                'shipping_etd' => $selectedService['etd'],
                'shipping_weight' => (int) ($prepared['weight'] ?? 0),
                'shipping_destination_city_id' => $destinationCityId,
                'shipping_metadata' => [
                    'origin' => [
                        'source' => $shippingOrigin['source'] ?? null,
                        'label' => $shippingOrigin['label'] ?? null,
                        'city_id' => $shippingOrigin['city_id'] ?? null,
                        'city_name' => $shippingOrigin['city_name'] ?? null,
                        'full_address' => $shippingOrigin['full_address'] ?? null,
                        'recipient_name' => $shippingOrigin['recipient_name'] ?? null,
                        'recipient_phone' => $shippingOrigin['recipient_phone'] ?? null,
                    ],
                    'destination' => [
                        'city_id' => $destinationCityId,
                        'district_id' => $destinationDistrictId,
                    ],
                    'item_weight' => (int) ($prepared['item_weight'] ?? 0),
                    'packaging_weight' => (int) ($prepared['packaging_weight'] ?? 0),
                    'strict_mode' => $this->preparer->isStrictShippingMode(),
                    'service_description' => $selectedService['description'],
                    'service_note' => $selectedService['note'],
                    'trade_in_discount' => $tradeInDiscount,
                    'requested_trade_in_discount' => $requestedTradeInDiscount,
                ],
            ]);

            foreach ($purchaseItems as $item) {
                SalesOrderItem::query()->create([
                    'sales_order_id' => (string) $order->id,
                    'product_id' => (string) $item['product_id'],
                    'product_name' => (string) $item['product_name'],
                    'variant_name' => (string) $item['variant_name'],
                    'variant_sku' => (string) $item['variant_sku'],
                    'warehouse' => (string) $item['warehouse'],
                    'quantity' => (int) $item['quantity'],
                    'unit_price' => (float) $item['unit_price'],
                    'landed_cost' => (float) $item['landed_cost'],
                    'line_total' => (float) $item['line_total'],
                    'metadata' => is_array($item['metadata']) ? $item['metadata'] : [],
                ]);
            }

            Invoice::query()->create([
                'order_id' => (string) $order->id,
                'invoice_number' => $this->invoiceSync->generateInvoiceNumber(),
                'payment_method' => $requiresPayment ? 'Midtrans Snap' : 'Tanpa Pembayaran',
                'amount_total' => $totalAmount,
                'payment_status' => $requiresPayment ? 'pending' : 'paid',
                'paid_at' => $requiresPayment ? null : now(),
            ]);

            $tradeInTransactions->each(function (TradeInTransaction $transaction) use ($order): void {
                $transaction->sales_order_id = (string) $order->id;
                $transaction->trade_in_only = false;
                $transaction->save();
            });

            $this->stockService->deductOnCheckout($order, $purchaseItems);

            return [
                'kind' => 'sales_order',
                'requires_payment' => $requiresPayment,
                'order_id' => (string) $order->id,
                'trade_in_transactions' => $tradeInTransactions->values()->all(),
                'shipping' => $selectedService,
                'shipping_weight' => (int) ($prepared['weight'] ?? 0),
                'items' => $purchaseItems,
            ];
        });

        if (($result['kind'] ?? 'sales_order') === 'trade_in') {
            return [
                'kind' => 'trade_in',
                'requires_payment' => false,
                'order' => null,
                'trade_in_transactions' => is_array($result['trade_in_transactions'] ?? null)
                    ? $result['trade_in_transactions']
                    : [],
                'snap_token' => null,
                'snap_redirect_url' => null,
                'shipping' => null,
                'shipping_weight' => 0,
            ];
        }

        $order = SalesOrder::query()
            ->with(['items.product', 'invoice', 'tradeInTransactions.photos', 'tradeInTransactions.requestedProduct'])
            ->findOrFail((string) $result['order_id']);

        if (! (bool) ($result['requires_payment'] ?? true)) {
            return [
                'kind' => 'sales_order',
                'requires_payment' => false,
                'order' => $order,
                'trade_in_transactions' => is_array($result['trade_in_transactions'] ?? null)
                    ? $result['trade_in_transactions']
                    : [],
                'snap_token' => null,
                'snap_redirect_url' => null,
                'shipping' => $result['shipping'],
                'shipping_weight' => (int) ($result['shipping_weight'] ?? 0),
            ];
        }

        $snap = $this->midtrans->createSnapToken(
            $this->buildSnapPayload(
                order: $order,
                user: $user,
                items: is_array($result['items']) ? $result['items'] : [],
                shippingService: is_array($result['shipping'] ?? null) ? $result['shipping'] : []
            )
        );

        $order->update([
            'snap_token' => $snap['token'],
            'payment_payload' => [
                'snap' => $snap['raw'],
                'shipping_quote' => $result['shipping'],
            ],
        ]);

        $this->invoiceSync->sync($order->fresh(), [
            'payment_type' => 'midtrans_snap',
        ]);

        return [
            'kind' => 'sales_order',
            'requires_payment' => true,
            'order' => $order->fresh(['items.product', 'invoice', 'tradeInTransactions.photos', 'tradeInTransactions.requestedProduct']),
            'trade_in_transactions' => is_array($result['trade_in_transactions'] ?? null)
                ? $result['trade_in_transactions']
                : [],
            'snap_token' => $snap['token'],
            'snap_redirect_url' => $snap['redirect_url'],
            'shipping' => $result['shipping'],
            'shipping_weight' => (int) ($result['shipping_weight'] ?? 0),
        ];
    }

private function resolveTradeInTransactions(User $user, array $preparedItems)
    {
        $requiredIds = collect($preparedItems)
            ->filter(fn (array $item): bool => (bool) ($item['metadata']['trade_in_enabled'] ?? false))
            ->map(fn (array $item): string => trim((string) ($item['metadata']['trade_in_transaction_id'] ?? '')))
            ->values();

        if ($requiredIds->contains(fn (string $id): bool => $id === '')) {
            throw ValidationException::withMessages([
                'items' => ['Produk trade-in wajib memiliki pengajuan trade-in yang valid sebelum checkout.'],
            ]);
        }

        if ($requiredIds->isEmpty()) {
            return collect();
        }

        $transactions = TradeInTransaction::query()
            ->whereIn('id', $requiredIds->all())
            ->where('user_id', (string) $user->id)
            ->lockForUpdate()
            ->get();

        if ($transactions->count() !== $requiredIds->unique()->count()) {
            throw ValidationException::withMessages([
                'items' => ['Sebagian data trade-in tidak ditemukan atau bukan milik akun Anda.'],
            ]);
        }

        foreach ($transactions as $transaction) {
            if ($transaction->sales_order_id !== null) {
                throw ValidationException::withMessages([
                    'items' => ['Pengajuan trade-in yang sama sudah dipakai pada checkout lain.'],
                ]);
            }
        }

        foreach ($preparedItems as $item) {
            $metadata = is_array($item['metadata'] ?? null) ? $item['metadata'] : [];
            if (! (bool) ($metadata['trade_in_enabled'] ?? false)) {
                continue;
            }

            $transactionId = trim((string) ($metadata['trade_in_transaction_id'] ?? ''));
            $matched = $transactions->firstWhere('id', $transactionId);

            if (! $matched instanceof TradeInTransaction) {
                throw ValidationException::withMessages([
                    'items' => ['Data trade-in untuk item checkout tidak cocok.'],
                ]);
            }

            if ((string) ($matched->requested_product_id ?? '') !== (string) ($item['product_id'] ?? '')) {
                throw ValidationException::withMessages([
                    'items' => ['Pengajuan trade-in tidak cocok dengan produk yang sedang di-checkout.'],
                ]);
            }
        }

        return $transactions;
    }

private function resolveShippingDestinationFromAddress(UserAddress $address): array
    {
        $destinationCityId = trim((string) $address->city_id);
        if (! preg_match('/^\d{4}$/', $destinationCityId)) {
            throw ValidationException::withMessages([
                'address_id' => ['Alamat pengiriman belum memiliki kota/kabupaten yang valid.'],
            ]);
        }

        $destinationDistrictId = trim((string) ($address->district_id ?? ''));
        if ($this->preparer->isStrictShippingMode() && $destinationDistrictId === '') {
            throw ValidationException::withMessages([
                'address_id' => ['Alamat pengiriman belum memiliki kecamatan. Lengkapi alamat untuk melihat ongkir.'],
            ]);
        }

        if ($destinationDistrictId !== '' && ! preg_match('/^\d{7}$/', $destinationDistrictId)) {
            throw ValidationException::withMessages([
                'address_id' => ['Alamat pengiriman belum memiliki kecamatan RajaOngkir yang valid.'],
            ]);
        }

        return [
            'city_id' => $destinationCityId,
            'district_id' => $destinationDistrictId !== '' ? $destinationDistrictId : null,
        ];
    }

private function resolveShippingService(array $services, string $requestedService): array
    {
        if ($requestedService === '') {
            $fallback = Arr::first($services);
            if (! is_array($fallback)) {
                throw ValidationException::withMessages([
                    'service' => ['Layanan pengiriman tidak ditemukan.'],
                ]);
            }

            return $fallback;
        }

        $matched = collect($services)->first(
            fn (array $service): bool => strcasecmp((string) $service['service'], $requestedService) === 0
        );

        if (! is_array($matched)) {
            throw ValidationException::withMessages([
                'service' => ['Layanan pengiriman tidak tersedia.'],
            ]);
        }

        return $matched;
    }

private function buildSnapPayload(
        SalesOrder $order,
        User $user,
        array $items,
        array $shippingService
    ): array {
        $itemDetails = collect($items)
            ->map(function (array $item): array {
                $rawName = trim((string) ($item['product_name'] ?? 'Produk'));
                $variantName = trim((string) ($item['variant_name'] ?? ''));
                $name = trim($variantName !== '' ? "{$rawName} ({$variantName})" : $rawName);

                return [
                    'id' => (string) ($item['variant_sku'] ?? $item['product_id']),
                    'price' => max(1, (int) round((float) ($item['unit_price'] ?? 0))),
                    'quantity' => max(1, (int) ($item['quantity'] ?? 1)),
                    'name' => Str::limit($name, 50, ''),
                ];
            })
            ->values()
            ->all();

        $itemDetails[] = [
            'id' => 'SHIPPING',
            'price' => max(0, (int) ($shippingService['cost'] ?? 0)),
            'quantity' => 1,
            'name' => Str::limit('Ongkir ' . (string) ($order->shipping_service ?? 'Reguler'), 50, ''),
        ];

        if ((float) $order->discount_amount > 0) {
            $itemDetails[] = [
                'id' => 'TRADEIN',
                'price' => -(int) round((float) $order->discount_amount),
                'quantity' => 1,
                'name' => Str::limit('Potongan Trade-In', 50, ''),
            ];
        }

        $appUrl = rtrim((string) config('app.frontend_url', config('app.url', '')), '/');
        $transactionsPath = $appUrl !== '' ? "{$appUrl}/transaksi" : null;
        $payload = [
            'transaction_details' => [
                'order_id' => (string) $order->order_number,
                'gross_amount' => max(1, (int) round((float) $order->total_amount)),
            ],
            'item_details' => $itemDetails,
            'customer_details' => [
                'first_name' => (string) $order->customer_name,
                'email' => (string) ($order->customer_email ?? $user->email ?? ''),
                'phone' => (string) ($order->customer_phone ?? ''),
            ],
            'metadata' => [
                'sales_order_id' => (string) $order->id,
                'shipping_service' => $order->shipping_service,
                'shipping_courier' => $order->shipping_courier,
            ],
        ];

        if ($transactionsPath) {
            $queryBase = http_build_query([
                'highlight' => (string) $order->id,
                'invoice' => (string) $order->order_number,
            ]);

            $payload['callbacks'] = [
                'finish' => "{$transactionsPath}?{$queryBase}&payment_status=finish",
                'unfinish' => "{$transactionsPath}?{$queryBase}&payment_status=unfinish",
                'error' => "{$transactionsPath}?{$queryBase}&payment_status=error",
            ];
        }

        return $payload;
    }

private function generateOrderNumber(): string
    {
        do {
            $candidate = sprintf('SO-%s-%04d', now()->format('Ymd'), random_int(0, 9999));
        } while (SalesOrder::query()->where('order_number', $candidate)->exists());

        return $candidate;
    }

private function composeAddressText(UserAddress $address): string
    {
        $segments = [
            $address->address_detail,
            $address->subdistrict,
            $address->district?->name,
            $address->city?->name,
            $address->province?->name,
            $address->zip_code,
        ];

        return implode(', ', array_filter($segments, fn ($segment): bool => is_string($segment) && trim($segment) !== ''));
    }
}
