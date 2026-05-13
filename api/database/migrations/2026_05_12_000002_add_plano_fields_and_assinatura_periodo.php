<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planos', function (Blueprint $table) {
            $table->decimal('preco_anual', 10, 2)->nullable()->after('preco');
            $table->unsignedInteger('max_cabecas')->nullable()->after('max_destaques');
        });

        Schema::table('assinaturas', function (Blueprint $table) {
            $table->enum('periodo', ['mensal', 'anual'])->default('mensal')->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('planos', function (Blueprint $table) {
            $table->dropColumn(['preco_anual', 'max_cabecas']);
        });
        Schema::table('assinaturas', function (Blueprint $table) {
            $table->dropColumn('periodo');
        });
    }
};
