<?php

$defaultAllowedOrigins = array_values(array_filter([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    env('APP_FRONTEND_URL'),
]));

$configuredAllowedOrigins = array_map(
    static fn ($origin) => trim((string) $origin),
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', implode(',', $defaultAllowedOrigins)))
);

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'register', 'logout', 'forgot-password', 'reset-password'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_unique(array_filter($configuredAllowedOrigins))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'Origin', 'X-Requested-With', 'X-XSRF-TOKEN'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => true,

];
