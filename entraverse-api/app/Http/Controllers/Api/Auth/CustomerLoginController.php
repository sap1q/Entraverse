<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class CustomerLoginController extends Controller
{
    use ApiResponse;

    public function login(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required|string|min:6',
                'remember' => 'boolean',
            ]);

            $user = User::where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                throw new AuthenticationException('Email atau password tidak valid.');
            }

            // Issue Sanctum token.
            // Token name includes context for audit/revocation tracing.
            $tokenName = sprintf('customer-app|ip:%s|ua:%s',
                substr($request->ip() ?? 'unknown', 0, 40),
                substr($request->userAgent() ?? 'unknown', 0, 60)
            );
            $token = $user->createToken($tokenName)->plainTextToken;

            $user->update(['last_login_at' => now()]);

            // Use configured expiration (default 10.080 minutes = 7 days via sanctum.php).
            // Do NOT hardcode 525.600 (1 year) — reduces blast radius if a token is compromised.
            $expiresIn = (int) config('sanctum.expiration', 10080);

            Log::info('Customer login success', ['user_id' => (string) $user->id]);

            return $this->success([
                'token'      => $token,
                'token_type' => 'Bearer',
                'user'       => $user,
                'expires_in' => $expiresIn,
            ], 'Login berhasil.');

        } catch (AuthenticationException $exception) {
            return $this->error('Email atau password tidak valid.', 401);
        } catch (ValidationException $exception) {
            return $this->error('Data login tidak valid.', 422, $exception->errors());
        } catch (Throwable $exception) {
            Log::error('Customer login failed', ['error' => $exception->getMessage()]);
            return $this->error('Terjadi kesalahan pada server.', 500);
        }
    }
}