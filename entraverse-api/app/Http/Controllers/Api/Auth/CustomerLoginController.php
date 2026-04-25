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

            // Issue token using Sanctum
            $token = $user->createToken('customer-app')->plainTextToken;

            $user->update(['last_login_at' => now()]);

            Log::info('Customer login success', ['user_id' => (string) $user->id]);

            return $this->success([
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
                'expires_in' => config('sanctum.expiration', 525600), // 1 year in minutes
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