<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('avaliacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anuncio_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('vendedor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('comprador_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('nota'); // 1-5
            $table->text('comentario')->nullable();
            $table->text('resposta_vendedor')->nullable();
            $table->boolean('negociacao_confirmada')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('avaliacoes');
    }
};
