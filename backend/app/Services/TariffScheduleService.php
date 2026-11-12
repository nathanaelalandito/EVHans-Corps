<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Location;
use App\Models\Tarif;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Mengatur periode tarif tanpa mengubah tarif yang telah dibekukan pada sesi. */
class TariffScheduleService
{
    /** Membuat tarif langsung atau terjadwal serta menutup periode tarif sebelumnya. */
    public function create(Location $location, User $actor, array $data): Tarif
    {
        $effectiveAt = ($data['mode'] ?? 'immediate') === 'scheduled'
            ? Carbon::parse($data['effective_at'])
            : now();

        if (($data['mode'] ?? 'immediate') === 'scheduled' && $effectiveAt->lessThanOrEqualTo(now())) {
            throw ValidationException::withMessages([
                'effective_at' => 'Waktu berlaku tarif baru harus berada di masa depan.',
            ]);
        }

        return DB::transaction(function () use ($location, $actor, $data, $effectiveAt): Tarif {
            $tariffs = Tarif::where('id_location', $location->id_location)
                ->orderBy('periode_mulai')
                ->lockForUpdate()
                ->get();

            $nextTariff = $tariffs->first(fn (Tarif $tarif): bool => $tarif->periode_mulai->greaterThanOrEqualTo($effectiveAt));
            if ($nextTariff?->periode_mulai->equalTo($effectiveAt)) {
                throw ValidationException::withMessages([
                    'effective_at' => 'Sudah ada tarif yang dijadwalkan pada waktu tersebut.',
                ]);
            }

            $previousTariff = $tariffs->first(fn (Tarif $tarif): bool => $tarif->periode_mulai->lessThan($effectiveAt) && $tarif->periode_berakhir->greaterThan($effectiveAt)
            );

            if (($data['mode'] ?? 'immediate') === 'scheduled' && $previousTariff?->periode_mulai->isFuture()) {
                throw ValidationException::withMessages([
                    'effective_at' => 'Jadwal tarif bertabrakan dengan jadwal lain yang belum berlaku.',
                ]);
            }

            $before = $previousTariff?->only(['id_tarif', 'harga_per_kwh', 'biaya_minimum', 'biaya_parkir_flat', 'periode_mulai', 'periode_berakhir']);
            if ($previousTariff) {
                $previousTariff->update(['periode_berakhir' => $effectiveAt]);
            }

            $tariff = Tarif::create([
                'id_location' => $location->id_location,
                'harga_per_kwh' => $data['harga_per_kwh'],
                'biaya_minimum' => $data['biaya_minimum'],
                'biaya_parkir_flat' => $data['biaya_parkir_flat'],
                'periode_mulai' => $effectiveAt,
                'periode_berakhir' => $nextTariff?->periode_mulai ?? $effectiveAt->copy()->addYears(10),
            ]);

            $this->recordAudit(
                $actor,
                $location,
                ($data['mode'] ?? 'immediate') === 'scheduled' ? 'jadwalkan_tarif' : 'ubah_tarif_langsung',
                'tarif',
                (string) $tariff->id_tarif,
                $before,
                $tariff->only(['id_tarif', 'harga_per_kwh', 'biaya_minimum', 'biaya_parkir_flat', 'periode_mulai', 'periode_berakhir'])
            );

            return $tariff;
        });
    }

    /** Menghapus jadwal yang belum berlaku dan menyambungkan kembali periode tarif sebelumnya. */
    public function cancelScheduled(Tarif $tariff, User $actor): void
    {
        if (! $tariff->periode_mulai->isFuture()) {
            throw ValidationException::withMessages([
                'tarif' => 'Tarif yang sudah berlaku tidak dapat dibatalkan.',
            ]);
        }

        DB::transaction(function () use ($tariff, $actor): void {
            $location = Location::findOrFail($tariff->id_location);
            $before = $tariff->only(['id_tarif', 'harga_per_kwh', 'biaya_minimum', 'biaya_parkir_flat', 'periode_mulai', 'periode_berakhir']);
            $previousTariff = Tarif::where('id_location', $tariff->id_location)
                ->where('periode_berakhir', $tariff->periode_mulai)
                ->lockForUpdate()
                ->first();
            $nextTariff = Tarif::where('id_location', $tariff->id_location)
                ->where('periode_mulai', '>', $tariff->periode_mulai)
                ->orderBy('periode_mulai')
                ->first();

            if ($previousTariff) {
                $previousTariff->update([
                    'periode_berakhir' => $nextTariff?->periode_mulai ?? now()->addYears(10),
                ]);
            }

            $tariff->delete();
            $this->recordAudit($actor, $location, 'batalkan_jadwal_tarif', 'tarif', (string) $before['id_tarif'], $before, null);
        });
    }

    /** Mengubah detail atau waktu tarif terjadwal dengan membatalkan jadwal lama secara tercatat. */
    public function reschedule(Tarif $tariff, User $actor, array $data): Tarif
    {
        if (! $tariff->periode_mulai->isFuture()) {
            throw ValidationException::withMessages([
                'tarif' => 'Hanya tarif yang belum berlaku yang dapat dijadwalkan ulang.',
            ]);
        }

        return DB::transaction(function () use ($tariff, $actor, $data): Tarif {
            $location = Location::findOrFail($tariff->id_location);
            $this->cancelScheduled($tariff, $actor);

            return $this->create($location, $actor, $data + ['mode' => 'scheduled']);
        });
    }

    /** Mencatat perubahan penting beserta nilai sebelum dan sesudah. */
    private function recordAudit(
        User $actor,
        Location $location,
        string $action,
        string $entity,
        ?string $entityId,
        ?array $before,
        ?array $after
    ): void {
        AuditLog::create([
            'id_user' => $actor->id_user,
            'id_location' => $location->id_location,
            'aksi' => $action,
            'entitas' => $entity,
            'id_entitas' => $entityId,
            'data_sebelum' => $before,
            'data_sesudah' => $after,
        ]);
    }
}
