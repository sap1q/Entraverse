<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SalesOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'order_number' => (string) $this->order_number,
            'status' => (string) $this->status,
            'payment_status' => (string) ($this->payment_status ?? 'pending'),
            'customer_name' => (string) $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'customer_email' => $this->customer_email,
            'customer_address' => $this->customer_address,
            'discount_amount' => (float) $this->discount_amount,
            'shipping_courier' => $this->shipping_courier,
            'shipping_service' => $this->shipping_service,
            'shipping_etd' => $this->shipping_etd,
            'shipping_weight' => (int) ($this->shipping_weight ?? 0),
            'subtotal' => (float) $this->subtotal,
            'shipping_cost' => (float) $this->shipping_cost,
            'total_amount' => (float) $this->total_amount,
            'items' => $this->items->map(function ($item): array {
                return [
                    'id' => (string) $item->id,
                    'product_id' => (string) $item->product_id,
                    'product_name' => (string) $item->product_name,
                    'variant_name' => $item->variant_name,
                    'variant_sku' => (string) $item->variant_sku,
                    'warehouse' => (string) $item->warehouse,
                    'quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                    'metadata' => is_array($item->metadata) ? $item->metadata : [],
                ];
            })->values()->all(),
            'created_at' => optional($this->created_at)?->toISOString(),
            'updated_at' => optional($this->updated_at)?->toISOString(),
        ];
    }
}
