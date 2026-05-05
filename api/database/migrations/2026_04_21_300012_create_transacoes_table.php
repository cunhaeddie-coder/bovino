<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Registra transações confirmadas entre vendedor e comprador
        // alimenta o módulo de inteligência de mercado (cotação por raça/região)
        Schema::create('transacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anuncio_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('comprador_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vendedor_id')->constrained('users')->cascadeOnDelete();
            $table->string('raca');
            $table->string('estado', 2);
            $table->string('municipio')->nullable();
            $table->decimal('valor_por_arroba', 10, 2)->nullable();
            $table->integer('qtd_cabecas');
            $table->decimal('peso_total', 10, 2)->nullable();
            $table->decimal('valor_total', 12, 2);
            $table->boolean('confirmada_comprador')->default(false);
            $table->boolean('confirmada_vendedor')->default(false);
            $table->timestamps();

            $table->index(['raca', 'estado', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transacoes');
    }
};
