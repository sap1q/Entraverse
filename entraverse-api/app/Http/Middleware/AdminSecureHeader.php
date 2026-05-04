<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminSecureHeader
{
    /**
     * Inject HTTP security headers for all API responses.
     *
     * These headers are recognized by browsers and provide real protection:
     * - HSTS:               Forces HTTPS, prevents protocol downgrade attacks.
     * - X-Content-Type:     Prevents MIME-type sniffing.
     * - X-Frame-Options:    Blocks clickjacking via iframes.
     * - Referrer-Policy:    Limits referrer information leakage.
     * - X-XSS-Protection:  Legacy XSS filter for older browsers.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Strict-Transport-Security: enforce HTTPS for 1 year, including subdomains.
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        // Prevent browsers from MIME-sniffing a response away from the declared content-type.
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Deny framing entirely — prevents clickjacking attacks.
        $response->headers->set('X-Frame-Options', 'DENY');

        // Only send origin when navigating to same origin; send nothing cross-origin.
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Legacy XSS protection header for older browsers (modern browsers use CSP instead).
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        return $response;
    }
}
