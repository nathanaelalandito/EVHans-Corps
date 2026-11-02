<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * TopupController (alur checkout QR / Virtual Account) menyimpan metode
     * pembayaran langsung di tabel topup dan tidak membuat baris payment,
     * jadi id_metode perlu ada dan id_payment harus boleh kosong.
     */
    public function up(): void
    {
        Schema::table('topup', function (Blueprint $table) {
            $table->dropForeign(['id_payment']);
        });

        Schema::table('topup', function (Blueprint $table) {
            $table->unsignedBigInteger('id_payment')->nullable()->change();
            $table->foreign('id_payment')
                ->references('id_payment')
                ->on('payment')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->unsignedBigInteger('id_metode')->nullable()->after('id_payment');
            $table->foreign('id_metode')
                ->references('id_metode')
                ->on('metode_pembayaran')
                ->cascadeOnUpdate()
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('topup', function (Blueprint $table) {
            $table->dropForeign(['id_metode']);
            $table->dropColumn('id_metode');
            $table->dropForeign(['id_payment']);
        });

        Schema::table('topup', function (Blueprint $table) {
            $table->unsignedBigInteger('id_payment')->nullable(false)->change();
            $table->foreign('id_payment')
                ->references('id_payment')
                ->on('payment')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
        });
    }
};
