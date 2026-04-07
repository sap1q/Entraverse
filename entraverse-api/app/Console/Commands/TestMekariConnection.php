<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Mekari\Exceptions\MekariApiException;
use App\Services\Mekari\Jurnal\JurnalProductService;
use Illuminate\Console\Command;
use InvalidArgumentException;
use Throwable;

class TestMekariConnection extends Command
{
    protected $signature = 'mekari:test-connection
        {--per-page=1 : Number of products to request for the smoke check}';

    protected $description = 'Verify Mekari Jurnal credentials and connectivity with a lightweight products request.';

    public function handle(): int
    {
        $this->components->info('Checking Mekari Jurnal connection...');
        $this->line(sprintf(
            'Base URL: %s%s',
            rtrim((string) config('services.mekari.base_url', 'https://api.mekari.com'), '/'),
            rtrim((string) config('services.mekari.jurnal_base_path', '/public/jurnal/api/v1'), '/')
        ));

        try {
            /** @var JurnalProductService $jurnalProduct */
            $jurnalProduct = app(JurnalProductService::class);
            $response = $jurnalProduct->getProducts([
                'page' => 1,
                'per_page' => max(1, (int) $this->option('per-page')),
            ]);

            $products = is_array($response['products'] ?? null) ? $response['products'] : [];

            $this->newLine();
            $this->components->info('Mekari Jurnal connection succeeded.');
            $this->line('Sample response keys: '.implode(', ', array_keys($response)));
            $this->line('Products returned in smoke check: '.count($products));

            return self::SUCCESS;
        } catch (InvalidArgumentException $exception) {
            $this->newLine();
            $this->components->error('Mekari Jurnal is not configured.');
            $this->line($exception->getMessage());

            return self::FAILURE;
        } catch (MekariApiException $exception) {
            $this->newLine();
            $this->components->error('Mekari Jurnal request failed.');
            $this->line('Status: '.($exception->getStatusCode() > 0 ? (string) $exception->getStatusCode() : 'transport_error'));
            $this->line('Error: '.$exception->getMessage());

            return self::FAILURE;
        } catch (Throwable $exception) {
            $this->newLine();
            $this->components->error('Unexpected error while checking Mekari Jurnal.');
            $this->line($exception->getMessage());

            return self::FAILURE;
        }
    }
}
