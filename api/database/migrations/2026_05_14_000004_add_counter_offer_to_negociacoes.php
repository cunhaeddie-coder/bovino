<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('negociacoes', function (Blueprint $table) {
            $table->decimal('preco_contra_proposta', 12, 2)->nullable()->after('preco_proposto');
            $table->enum('contra_proposta_de', ['comprador', 'vendedor'])->nullable()->after('preco_contra_proposta');
            $table->decimal('cotacao_arroba_momento', 10, 2)->nullable()->after('contra_proposta_de');
        });
    }

    public function down(): void
    {
        Schema::table('negociacoes', function (Blueprint $table) {
            $table->dropColumn(['preco_contra_proposta', 'contra_proposta_de', 'cotacao_arroba_momento']);
        });
    }
};
