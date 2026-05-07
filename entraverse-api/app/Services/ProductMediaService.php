<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\UploadedFile;

class ProductMediaService
{
    private const MAX_PRODUCT_PHOTOS = 5;

public function resolveVariantImageUploads(array $variantImageFiles): array
    {
        $mappedUploads = [];

        foreach ($variantImageFiles as $key => $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $normalizedKey = $this->cleanText((string) $key);
            if ($normalizedKey === '') {
                continue;
            }

            $path = $file->store('products/variants', 'public');
            $mappedUploads[$normalizedKey] = '/storage/' . ltrim($path, '/');
        }

        return $mappedUploads;
    }

public function resolvePhotos(mixed $photos, array $uploadedImages, array $existingPhotos): array
    {
        $uploadMarkerPrefix = '__UPLOAD__:';

        $isValidUrl = static function (string $value): bool {
            $trimmed = trim($value);
            if ($trimmed === '') return false;
            return !str_starts_with($trimmed, 'blob:') && !str_starts_with($trimmed, 'data:');
        };

        $normalizePhotoItem = static function (mixed $photo) use ($isValidUrl): ?array {
            if (is_string($photo)) {
                $trimmed = trim($photo);
                if (! $isValidUrl($trimmed)) return null;
                return [
                    'url' => $trimmed,
                    'alt' => null,
                    'is_primary' => false,
                ];
            }

            if (is_array($photo)) {
                $url = trim((string) ($photo['url'] ?? ''));
                if (! $isValidUrl($url)) return null;
                return [
                    'url' => $url,
                    'alt' => is_string($photo['alt'] ?? null) ? $photo['alt'] : null,
                    'is_primary' => false,
                ];
            }

            return null;
        };

        $sanitizePhotos = function (array $items): array {
            return array_values(array_filter($items, function (mixed $photo): bool {
                if (is_string($photo)) {
                    $trimmed = trim($photo);
                    if ($trimmed === '') return false;
                    return !str_starts_with($trimmed, 'blob:') && !str_starts_with($trimmed, 'data:');
                }

                if (is_array($photo)) {
                    $url = trim((string) ($photo['url'] ?? ''));
                    if ($url === '') return false;
                    return !str_starts_with($url, 'blob:') && !str_starts_with($url, 'data:');
                }

                return false;
            }));
        };

        $mappedUploads = [];
        foreach ($uploadedImages as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $path = $file->store('products', 'public');
            $mappedUploads[] = [
                'url' => '/storage/' . ltrim($path, '/'),
                'alt' => null,
                'is_primary' => false,
            ];
        }

        // New synchronized flow: `photos` can contain ordered placeholders "__UPLOAD__:<n>".
        if (is_array($photos)) {
            $orderedPhotos = [];
            $uploadCursor = 0;

            foreach ($this->normalizeArray($photos) as $photo) {
                if (is_string($photo) && str_starts_with($photo, $uploadMarkerPrefix)) {
                    if (isset($mappedUploads[$uploadCursor])) {
                        $orderedPhotos[] = $mappedUploads[$uploadCursor];
                        $uploadCursor++;
                    }
                    continue;
                }

                $normalized = $normalizePhotoItem($photo);
                if ($normalized !== null) {
                    $orderedPhotos[] = $normalized;
                }
            }

            // Backward compatibility: append remaining uploaded files if marker not provided for all.
            while (isset($mappedUploads[$uploadCursor])) {
                $orderedPhotos[] = $mappedUploads[$uploadCursor];
                $uploadCursor++;
            }

            return $this->finalizePhotos($orderedPhotos);
        }

        $basePhotos = $sanitizePhotos($this->normalizeArray($existingPhotos));
        $normalizedBase = array_values(array_filter(array_map($normalizePhotoItem, $basePhotos)));
        $merged = array_values(array_merge($normalizedBase, $mappedUploads));

        return $this->finalizePhotos($merged);
    }

private function finalizePhotos(array $items): array
    {
        $result = [];
        $seen = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $url = trim((string) ($item['url'] ?? ''));
            if ($url === '' || str_starts_with($url, 'blob:') || str_starts_with($url, 'data:')) {
                continue;
            }

            $dedupeKey = strtolower($url);
            if (isset($seen[$dedupeKey])) {
                continue;
            }

            $seen[$dedupeKey] = true;
            $result[] = [
                'url' => $url,
                'alt' => is_string($item['alt'] ?? null) ? $item['alt'] : null,
                'is_primary' => false,
            ];

            if (count($result) >= self::MAX_PRODUCT_PHOTOS) {
                break;
            }
        }

        return array_values(array_map(
            fn (array $photo, int $index) => [
                ...$photo,
                'is_primary' => $index === 0,
            ],
            $result,
            array_keys($result)
        ));
    }

public function normalizeArray(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $result = [];
        foreach ($value as $key => $item) {
            $cleanKey = is_string($key) ? $this->cleanText($key) : $key;
            if (is_array($item)) {
                $result[$cleanKey] = $this->normalizeArray($item);
                continue;
            }

            $result[$cleanKey] = is_string($item) ? $this->cleanText($item) : $item;
        }

        return $result;
    }

public function isPersistableMediaPath(string $value): bool
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return false;
        }

        return ! str_starts_with($trimmed, 'blob:') && ! str_starts_with($trimmed, 'data:');
    }

private function cleanText(string $value): string
    {
        return trim(strip_tags($value));
    }
}