<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Checkout\PlaceOrderAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\ProcessCheckoutRequest;
use App\Http\Resources\SalesOrderResource;
use App\Http\Resources\TradeInTransactionResource;
use App\Models\SalesOrder;
use App\Models\TradeInTransaction;
use App\Models\User;
use App\Services\MidtransService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class CheckoutController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly PlaceOrderAction $placeOrderAction,
        private readonly MidtransService $midtransService
    ) {
    }

    public function process(ProcessCheckoutRequest $request): JsonResponse
    {
        try {
            /** @var User $user */
            $user = $request->user();
            $result = $this->placeOrderAction->execute($user, $request->validated());
            $order = $result['order'];

            return $this->created([
                'entry_kind' => (string) ($result['kind'] ?? 'sales_order'),
                'requires_payment' => (bool) ($result['requires_payment'] ?? true),
                'order' => $order instanceof SalesOrder ? (new SalesOrderResource($order))->toArray($request) : null,
                'trade_in_transactions' => collect($result['trade_in_transactions'] ?? [])
                    ->map(fn (TradeInTransaction $transaction): array => (new TradeInTransactionResource($transaction))->toArray($request))
                    ->values()
                    ->all(),
                'snap_token' => $result['snap_token'],
                'snap_redirect_url' => $result['snap_redirect_url'],
                'midtrans_client_key' => $this->midtransService->clientKey(),
                'midtrans_snap_js_url' => $this->midtransService->snapJsUrl(),
                'shipping' => $result['shipping'],
                'shipping_weight' => $result['shipping_weight'],
            ], 'Checkout berhasil diproses.');
        } catch (ValidationException $exception) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi checkout gagal.',
                'errors' => $exception->errors(),
            ], 422);
        } catch (RuntimeException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    protected function created(mixed $data = null, ?string $message = null): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message ?? 'Created',
            'data' => $data,
        ], 201);
    }
}
