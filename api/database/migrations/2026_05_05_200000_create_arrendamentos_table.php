<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('arrendamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained()->cascadeOnDelete();
            $table->enum('tipo', ['tomador', 'cedente'])->default('tomador');
            $table->string('nome_propriedade');
            $table->string('contraparte_nome');
            $table->string('contato')->nullable();
            $table->string('estado', 2)->nullable();
            $table->string('municipio')->nullable();
            $table->decimal('area_hectares', 10, 2)->nullable();
            $table->decimal('valor_mensal', 10, 2);
            $table->enum('tipo_pagamento', ['mensal', 'semestral', 'anual', 'por_cabeca'])->default('mensal');
            $table->tinyInteger('dia_vencimento')->default(10);
            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->enum('status', ['ativo', 'encerrado', 'suspenso'])->default('ativo');
            $table->text('observacoes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('arrendamentos');
    }
};
