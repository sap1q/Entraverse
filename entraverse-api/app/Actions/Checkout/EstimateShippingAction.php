<?php
declare(strict_types=1);
namespace App\Actions\Checkout;
use App\Models\User;
use App\Models\UserAddress;
use App\Services\OrderItemPreparer;
use App\Services\RajaOngkirService;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
class EstimateShippingAction
{
    public function __construct(
        private readonly RajaOngkirService $rajaOngkir,
        private readonly OrderItemPreparer $preparer,
    ) {
    }
public function execute(
        User $user,
        string $courier,
        ?string $addressId = null,
        ?string $destinationCityId = null,
        ?string $destinationDistrictId = null,
        ?int $weight = null,
        array $itemsPayload = []
    ): array
    {
        $normalizedCourier = Str::lower(trim($courier));
        $origin = $this->rajaOngkir->getShippingOrigin();
        $prepared = $itemsPayload !== [] ? $this->preparer->prepare($itemsPayload, lockProducts: false) : null;
        $destination = $this->resolveShippingDestination(
            user: $user,
            addressId: $addressId,
            cityId: $destinationCityId,
            districtId: $destinationDistrictId
        );

        if ($prepared !== null) {
            if (($prepared['purchase_items'] ?? []) === []) {
                throw ValidationException::withMessages([
                    'items' => ['Tidak ada item pembelian yang memerlukan ongkir pada checkout ini.'],
                ]);
            }

            $itemWeight = max(1, (int) ($prepared['item_weight'] ?? 0));
            $packagingWeight = max(0, (int) ($prepared['packaging_weight'] ?? 0));
            $normalizedWeight = max(1, (int) ($prepared['weight'] ?? 0));
        } else {
            $itemWeight = max(0, (int) ($weight ?? 0));
            if ($itemWeight < 1) {
                throw ValidationException::withMessages([
                    'weight' => ['Berat pengiriman wajib diisi atau kirim daftar item checkout.'],
                ]);
            }

            $packagingWeight = $this->preparer->resolvePackagingWeightInGram();
            $normalizedWeight = max(1, $itemWeight + $packagingWeight);
        }

        $options = $this->rajaOngkir->getShippingCost(
            destinationCityId: $destination['city_id'],
            weight: $normalizedWeight,
            courier: $normalizedCourier,
            destinationDistrictId: $destination['district_id']
        );

        return [
            'courier' => $normalizedCourier,
            'origin_city_id' => (string) ($origin['city_id'] ?? ''),
            'destination_city_id' => $destination['city_id'],
            'destination_district_id' => $destination['district_id'],
            'item_weight' => $itemWeight,
            'packaging_weight' => $packagingWeight,
            'weight' => $normalizedWeight,
            'strict_mode' => $this->preparer->isStrictShippingMode(),
            'origin' => $origin,
            'options' => $options,
        ];
    }
private function resolveShippingDestination(
        User $user,
        ?string $addressId = null,
        ?string $cityId = null,
        ?string $districtId = null
    ): array {
        $normalizedAddressId = trim((string) ($addressId ?? ''));
        if ($normalizedAddressId !== '') {
            $address = UserAddress::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->whereKey($normalizedAddressId)
                ->first();

            if (! $address) {
                throw ValidationException::withMessages([
                    'address_id' => ['Alamat pengiriman tidak ditemukan.'],
                ]);
            }

            return $this->resolveShippingDestinationFromAddress($address);
        }

        $normalizedCityId = trim((string) ($cityId ?? ''));
        if (! preg_match('/^\d{4}$/', $normalizedCityId)) {
            throw ValidationException::withMessages([
                'city_id' => ['Kota tujuan tidak valid. Perbarui alamat pengiriman terlebih dahulu.'],
            ]);
        }

        $normalizedDistrictId = trim((string) ($districtId ?? ''));
        if ($this->preparer->isStrictShippingMode() && $normalizedDistrictId === '') {
            throw ValidationException::withMessages([
                'district_id' => ['Kecamatan tujuan wajib dipilih untuk menghitung ongkir.'],
            ]);
        }

        if ($normalizedDistrictId !== '' && ! preg_match('/^\d{7}$/', $normalizedDistrictId)) {
            throw ValidationException::withMessages([
                'district_id' => ['Kecamatan tujuan tidak valid.'],
            ]);
        }

        return [
            'city_id' => $normalizedCityId,
            'district_id' => $normalizedDistrictId !== '' ? $normalizedDistrictId : null,
        ];
    }

private function resolveShippingDestinationFromAddress(UserAddress $address): array
    {
        $destinationCityId = trim((string) $address->city_id);
        if (! preg_match('/^\d{4}$/', $destinationCityId)) {
            throw ValidationException::withMessages([
                'address_id' => ['Alamat pengiriman belum memiliki kota/kabupaten yang valid.'],
            ]);
        }

        $destinationDistrictId = trim((string) ($address->district_id ?? ''));
        if ($this->preparer->isStrictShippingMode() && $destinationDistrictId === '') {
            throw ValidationException::withMessages([
                'address_id' => ['Alamat pengiriman belum memiliki kecamatan. Lengkapi alamat untuk melihat ongkir.'],
            ]);
        }

        if ($destinationDistrictId !== '' && ! preg_match('/^\d{7}$/', $destinationDistrictId)) {
            throw ValidationException::withMessages([
                'address_id' => ['Alamat pengiriman belum memiliki kecamatan RajaOngkir yang valid.'],
            ]);
        }

        return [
            'city_id' => $destinationCityId,
            'district_id' => $destinationDistrictId !== '' ? $destinationDistrictId : null,
        ];
    }
}