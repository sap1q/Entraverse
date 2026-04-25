<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = trim((string) env('ADMIN_SEED_EMAIL', 'admin@example.com'));
        $password = (string) env('ADMIN_SEED_PASSWORD', 'password123');
        $name = trim((string) env('ADMIN_SEED_NAME', 'Entraverse Admin'));

        $admin = Admin::query()
            ->where('email', $email)
            ->orWhere('role', 'superadmin')
            ->orderByRaw("CASE WHEN email = ? THEN 0 ELSE 1 END", [$email])
            ->first();

        if ($admin) {
            $admin->forceFill([
                'name' => $name,
                'email' => $email,
                'role' => 'superadmin',
                'password' => Hash::make($password),
                'last_login_at' => null,
            ])->save();

            $this->command?->info('Admin updated: '.$email);
            return;
        }

        Admin::query()->create([
            'id' => (string) Str::uuid(),
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'superadmin',
            'last_login_at' => null,
        ]);

        $this->command?->info('Admin created: '.$email);
    }
}
