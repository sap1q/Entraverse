<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return ['Laravel' => app()->version()];
});

Route::get('/storage/{path}', function (string $path) {
    $normalizedPath = ltrim($path, '/');

    if ($normalizedPath === '' || ! Storage::disk('public')->exists($normalizedPath)) {
        abort(404);
    }

    return Storage::disk('public')->response($normalizedPath);
})->where('path', '.*');

require __DIR__.'/auth.php';
