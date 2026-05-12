<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('avaliacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negociacao_id')->constrained('negociacoes')->cascadeOnDelete();
            $table->foreignId('anuncio_id')->nullable()->constrained('anuncios')->nullOnDelete();
            $table->unsignedBigInteger('vendedor_id');
            $table->unsignedBigInteger('comprador_id');
            $table->tinyInteger('nota'); // 1–5
            $table->text('comentario')->nullable();
            $table->text('resposta_vendedor')->nullable();
            $table->boolean('negociacao_confirmada')->default(true);
            $table->timestamps();

            $table->unique('negociacao_id'); // 1 avaliação por negociação
            $table->index('vendedor_id');
            $table->index('comprador_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('avaliacoes');
    }
};
