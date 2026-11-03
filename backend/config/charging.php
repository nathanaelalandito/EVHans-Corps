<?php

return [
    // Jarak maksimum (meter) driver dari station agar boleh memulai sesi charging.
    // Harus sama dengan ARRIVAL_RADIUS_M di frontend (src/api/station.js).
    'arrival_radius_m' => (int) env('CHARGING_ARRIVAL_RADIUS_M', 200),

    // Set CHARGING_REQUIRE_ARRIVAL=false di .env HANYA untuk pengembangan
    // (mis. menguji dari laptop yang jauh dari station seeder).
    'require_arrival' => (bool) env('CHARGING_REQUIRE_ARRIVAL', true),

    // Kapasitas baterai (kWh) yang dipakai kalau data kendaraan belum punya
    // kolom `kapasitas_baterai_kwh`. Dipakai untuk membatasi pengisian maks. 100%.
    'default_battery_kwh' => (float) env('CHARGING_DEFAULT_BATTERY_KWH', 50),

    // SIMULASI pengisian (sementara, sampai data asli dari Perangkat Charger ada).
    // Energi dihitung dari lama sesi berjalan: daya port (kW) x waktu x kecepatan.
    // 60 = 1 menit nyata dianggap 1 jam charging. Set 1 untuk waktu nyata.
    'simulation_speed' => (float) env('CHARGING_SIMULATION_SPEED', 60),
];