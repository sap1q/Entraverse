<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DeprecatedRoute
{
    public function handle(Request $request, Closure $next, string $sunsetDate = '2026-06-01'): Response
    {
        $response = $next($request);
        $response->headers->set('Deprecation', 'true');
        $response->headers->set('Sunset', $sunsetDate);
        $response->headers->set('Link', '<https://api.entraverse.com/v1>; rel="successor-version"');

        return $response;
    }
}