<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class CustomerLogoutController extends Controller
{
    use ApiResponse;

    public function logout(Request $request): JsonResponse
    {
        try {
            // Revoke the token that was used to authenticate this request
            $request->user()->currentAccessToken()->delete();

            Log::info('Customer logout success', ['user_id' => (string) $request->user()->id]);

            return $this->success(null, 'Logout berhasil.');
        } catch (Throwable $exception) {
            Log::error('Customer logout failed', ['error' => $exception->getMessage()]);
            return $this->error('Terjadi kesalahan pada server.', 500);
        }
    }
}