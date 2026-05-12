<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('anuncios', function (Blueprint $table) {
            $table->boolean('exibir_na_fazenda')->default(false)->after('destaque');
        });
    }

    public function down(): void
    {
        Schema::table('anuncios', function (Blueprint $table) {
            $table->dropColumn('exibir_na_fazenda');
        });
    }
};
