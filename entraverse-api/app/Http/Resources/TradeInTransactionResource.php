<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TradeInTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'transaction_number' => (string) $this->transaction_number,
            'status' => (string) $this->status,
            'trade_in_only' => (bool) $this->trade_in_only,
            'estimated_amount' => (float) $this->estimated_amount,
            'requested_product_name' => $this->requested_product_name,
            'created_at' => optional($this->created_at)?->toISOString(),
            'updated_at' => optional($this->updated_at)?->toISOString(),
        ];
    }
}
