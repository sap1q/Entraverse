<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

test('customer profile endpoint returns avatar url from the v1 avatar route', function (): void {
    $user = User::factory()->create([
        'avatar_path' => 'avatars/' . Str::uuid() . '.jpg',
    ]);

    Sanctum::actingAs($user, ['*']);

    $response = $this->getJson('/api/v1/user');

    $response
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.id', (string) $user->id)
        ->assertJsonPath(
            'data.avatar',
            route('v1.user.avatar', [
                'user' => (string) $user->id,
                'v' => $user->updated_at?->timestamp,
            ], false)
        );
});
