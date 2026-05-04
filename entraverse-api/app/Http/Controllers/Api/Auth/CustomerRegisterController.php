<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class CustomerRegisterController extends Controller
{
    use ApiResponse;

    public function register(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6|confirmed',
            ]);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'email_verified_at' => now(), // Auto verify for simplicity
            ]);

            // Issue Sanctum token.
            $token = $user->createToken('customer-app')->plainTextToken;

            Log::info('Customer registration success', ['user_id' => (string) $user->id]);

            // Use configured expiration (default 10.080 minutes = 7 days via sanctum.php).
            $expiresIn = (int) config('sanctum.expiration', 10080);

            return $this->success([
                'token'      => $token,
                'token_type' => 'Bearer',
                'user'       => $user,
                'expires_in' => $expiresIn,
            ], 'Registrasi berhasil.');

        } catch (ValidationException $exception) {
            return $this->error('Data registrasi tidak valid.', 422, $exception->errors());
        } catch (Throwable $exception) {
            Log::error('Customer registration failed', ['error' => $exception->getMessage()]);
            return $this->error('Terjadi kesalahan pada server.', 500);
        }
    }
}