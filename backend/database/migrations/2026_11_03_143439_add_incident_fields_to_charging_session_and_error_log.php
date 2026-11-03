<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('charging_session', function (Blueprint $table) {
            $table->string('kegagalan_kategori', 50)->nullable()->after('soc_akhir');
            $table->string('kegagalan_sumber', 20)->nullable()->after('kegagalan_kategori');
            $table->text('kegagalan_catatan')->nullable()->after('kegagalan_sumber');
            $table->boolean('deteksi_otomatis')->default(false)->after('kegagalan_catatan');
            $table->dateTime('heartbeat_terakhir')->nullable()->after('deteksi_otomatis');
            $table->index('status');
        });

        Schema::table('error_log', function (Blueprint $table) {
            $table->unsignedBigInteger('id_port')->nullable()->after('id_session');
            $table->foreign('id_port')->references('id_port')->on('ports')->nullOnDelete();

            $table->string('kategori', 50)->nullable()->after('jenis_error');
            $table->string('sumber', 20)->default('sistem')->after('kategori');
            $table->string('tingkat', 20)->default('Tinggi')->after('sumber');

            $table->char('ditangani_oleh', 13)->nullable()->after('status_tanganan');
            $table->foreign('ditangani_oleh')->references('id_user')->on('users')->nullOnDelete();
            $table->dateTime('waktu_selesai_tangani')->nullable()->after('ditangani_oleh');
        });
    }

    public function down(): void
    {
        Schema::table('error_log', function (Blueprint $table) {
            $table->dropForeign(['id_port']);
            $table->dropForeign(['ditangani_oleh']);
            $table->dropColumn(['id_port', 'kategori', 'sumber', 'tingkat', 'ditangani_oleh', 'waktu_selesai_tangani']);
        });

        Schema::table('charging_session', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn(['kegagalan_kategori', 'kegagalan_sumber', 'kegagalan_catatan', 'deteksi_otomatis', 'heartbeat_terakhir']);
        });
    }
};
