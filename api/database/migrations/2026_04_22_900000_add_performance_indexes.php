<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Marketplace: busca por raça + estado + status (filtros mais usados na listagem)
        Schema::table('animais', function (Blueprint $table) {
            $table->index(['estado', 'raca', 'status'], 'animais_busca_idx');
        });

        // Marketplace: ordenação e filtro por preço; validade do anúncio
        Schema::table('anuncios', function (Blueprint $table) {
            $table->index('preco_unitario', 'anuncios_preco_idx');
            $table->index('expira_em',      'anuncios_expira_idx');
        });

        // Analytics: agrupamento de buscas por raça e estado
        Schema::table('buscas_log', function (Blueprint $table) {
            $table->index(['raca', 'estado'], 'buscas_log_raca_estado_idx');
        });

        // Gestão: listagem de rebanho por fazenda e status (query mais frequente do módulo)
        Schema::table('rebanho', function (Blueprint $table) {
            $table->index(['fazenda_id', 'status'], 'rebanho_fazenda_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('animais',    fn (Blueprint $t) => $t->dropIndex('animais_busca_idx'));
        Schema::table('anuncios',   function (Blueprint $t) {
            $t->dropIndex('anuncios_preco_idx');
            $t->dropIndex('anuncios_expira_idx');
        });
        Schema::table('buscas_log', fn (Blueprint $t) => $t->dropIndex('buscas_log_raca_estado_idx'));
        Schema::table('rebanho',    fn (Blueprint $t) => $t->dropIndex('rebanho_fazenda_status_idx'));
    }
};
