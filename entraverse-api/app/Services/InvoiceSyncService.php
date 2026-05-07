<?php
declare(strict_types=1);
namespace App\Services;
use App\Models\Invoice;
use App\Models\SalesOrder;
use Carbon\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
class InvoiceSyncService
{
public function sync(SalesOrder $order, array $payload = []): Invoice
    {
        $invoice = $order->invoice()->firstOrNew();
        if (! $invoice->exists) {
            $invoice->invoice_number = $this->generateInvoiceNumber();
        }

        $paymentType = Str::lower(trim((string) ($payload['payment_type'] ?? $order->payment_method ?? '')));
        $invoiceStatus = $this->mapInvoicePaymentStatus((string) ($order->payment_status ?? 'pending'));
        $settledAt = $order->settled_at ?? $this->resolveSettlementDate($payload);

        $invoice->payment_method = $this->resolveInvoicePaymentMethod($paymentType, $payload, $invoice->payment_method);
        $invoice->payment_va_number = $this->resolveInvoiceVaNumber($payload) ?? $invoice->payment_va_number;
        $invoice->payment_bill_key = $this->resolveInvoiceBillKey($payload) ?? $invoice->payment_bill_key;
        $invoice->amount_total = (float) $order->total_amount;
        $invoice->payment_status = $invoiceStatus;
        $invoice->snap_token = trim((string) ($order->snap_token ?? '')) !== ''
            ? (string) $order->snap_token
            : $invoice->snap_token;
        $invoice->expiry_time = $this->resolveInvoiceExpiryTime($payload) ?? $invoice->expiry_time;

        if ($invoiceStatus === 'paid') {
            $invoice->paid_at = $settledAt ?? $invoice->paid_at ?? now();
        }

        $invoice->save();

        return $invoice->fresh();
    }
public function mapInvoicePaymentStatus(string $paymentStatus): string
    {
        $normalized = Str::lower(trim($paymentStatus));

        return match (true) {
            in_array($normalized, ['settlement', 'capture', 'paid'], true) => 'paid',
            in_array($normalized, ['expire', 'expired'], true) => 'expired',
            in_array($normalized, ['deny', 'cancel', 'cancelled', 'failure', 'failed'], true) => 'failed',
            default => 'pending',
        };
    }

public function resolveInvoicePaymentMethod(string $paymentType, array $payload, ?string $fallback = null): string
    {
        $bank = Str::lower(trim((string) Arr::get($payload, 'va_numbers.0.bank', '')));

        if ($paymentType === 'bank_transfer' && $bank !== '') {
            return match ($bank) {
                'bca' => 'BCA Virtual Account',
                'bni' => 'BNI Virtual Account',
                'bri' => 'BRI Virtual Account',
                default => strtoupper($bank) . ' Virtual Account',
            };
        }

        if ($paymentType === 'echannel') {
            return 'Mandiri Bill';
        }

        if ($this->resolveInvoiceVaNumber($payload) !== null && trim((string) Arr::get($payload, 'permata_va_number', '')) !== '') {
            return 'Permata Virtual Account';
        }

        return match ($paymentType) {
            'gopay' => 'GoPay',
            'shopeepay' => 'ShopeePay',
            'qris' => 'QRIS',
            'credit_card' => 'Kartu Kredit',
            'debit_card' => 'Kartu Debit',
            'cstore' => ucfirst((string) Arr::get($payload, 'store', 'Gerai')),
            'midtrans_snap' => 'Midtrans Snap',
            '' => trim((string) ($fallback ?? 'Midtrans Snap')) !== '' ? (string) $fallback : 'Midtrans Snap',
            default => (string) Str::of($paymentType)->replace(['_', '-'], ' ')->title(),
        };
    }

public function resolveInvoiceVaNumber(array $payload): ?string
    {
        $candidates = [
            Arr::get($payload, 'va_numbers.0.va_number'),
            Arr::get($payload, 'permata_va_number'),
            Arr::get($payload, 'payment_code'),
        ];

        foreach ($candidates as $candidate) {
            if (! is_string($candidate) && ! is_numeric($candidate)) {
                continue;
            }

            $normalized = trim((string) $candidate);
            if ($normalized !== '') {
                return $normalized;
            }
        }

        return null;
    }

public function resolveInvoiceBillKey(array $payload): ?string
    {
        $candidate = Arr::get($payload, 'bill_key');
        if (! is_string($candidate) && ! is_numeric($candidate)) {
            return null;
        }

        $normalized = trim((string) $candidate);

        return $normalized !== '' ? $normalized : null;
    }

public function resolveInvoiceExpiryTime(array $payload): ?Carbon
    {
        $candidate = Arr::get($payload, 'expiry_time');
        if (! is_string($candidate) || trim($candidate) === '') {
            return null;
        }

        try {
            return Carbon::parse($candidate);
        } catch (\Throwable) {
            return null;
        }
    }

public function generateInvoiceNumber(): string
    {
        $dateSegment = now()->format('Ymd');
        $prefix = sprintf('INV/%s/ENT/', $dateSegment);

        do {
            $sequence = Invoice::query()
                ->where('invoice_number', 'like', "{$prefix}%")
                ->count() + 1;
            $candidate = sprintf('%s%03d', $prefix, $sequence);
        } while (Invoice::query()->where('invoice_number', $candidate)->exists());

        return $candidate;
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
}