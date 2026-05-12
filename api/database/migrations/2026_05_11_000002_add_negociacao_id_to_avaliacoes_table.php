<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('avaliacoes', function (Blueprint $table) {
            $table->foreignId('negociacao_id')
                ->nullable()
                ->after('id')
                ->constrained('negociacoes')
                ->cascadeOnDelete();

            $table->unique('negociacao_id');
            $table->index('vendedor_id');
            $table->index('comprador_id');
        });
    }

    public function down(): void
    {
        Schema::table('avaliacoes', function (Blueprint $table) {
            $table->dropForeign(['negociacao_id']);
            $table->dropUnique(['negociacao_id']);
            $table->dropIndex(['vendedor_id']);
            $table->dropIndex(['comprador_id']);
            $table->dropColumn('negociacao_id');
        });
    }
};
