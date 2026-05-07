<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\Auth\AuthResource;
use App\Models\Admin;
use App\Services\Auth\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;
use Throwable;

class RegisterController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuthService $authService)
    {
    }

    private function resolveActor(Request $request): ?Admin
    {
        $user = $request->user();
        if ($user instanceof Admin) {
            return $user;
        }

        $bearerToken = $request->bearerToken();
        if (! $bearerToken) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($bearerToken);
        $tokenable = $accessToken?->tokenable;

        return $tokenable instanceof Admin ? $tokenable : null;
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $actor = $this->resolveActor($request);

        $hasAdmins = Admin::query()->exists();

        // Use config() — NOT env() — so this reads correctly after `php artisan config:cache`.
        // Calling env() directly in a controller always returns null in cached environments.
        $allowBootstrap = (bool) config('services.admin.allow_bootstrap', false);

        if (! $hasAdmins && ! $allowBootstrap) {
            return $this->error('Bootstrap admin publik dinonaktifkan. Gunakan seeder atau CLI.', 403);
        }

        if ($hasAdmins && (! $actor || $actor->role !== 'superadmin')) {
            return $this->error('Hanya super admin yang bisa mendaftarkan admin baru.', 403);
        }

        try {
            $result = $this->authService->register($request->validated());

            return $this->created(
                new AuthResource($result['token'], $result['admin']),
                'Admin berhasil didaftarkan.'
            );
        } catch (Throwable $exception) {
            Log::error('Register failed', ['error' => $exception->getMessage()]);
            return $this->error('Terjadi kesalahan pada server.', 500);
        }
    }
}
