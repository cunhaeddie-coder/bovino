<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Muda o default para true — anúncios aparecem na fazenda por padrão (opt-out)
        Schema::table('anuncios', function (Blueprint $table) {
            $table->boolean('exibir_na_fazenda')->default(true)->change();
        });

        // Backfill: todos os anúncios existentes passam a aparecer na fazenda
        DB::table('anuncios')->whereNull('deleted_at')->update(['exibir_na_fazenda' => true]);
    }

    public function down(): void
    {
        Schema::table('anuncios', function (Blueprint $table) {
            $table->boolean('exibir_na_fazenda')->default(false)->change();
        });
    }
};
