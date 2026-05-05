<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('negociacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anuncio_id')->constrained()->cascadeOnDelete();
            $table->foreignId('comprador_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vendedor_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['aberta', 'aceita', 'recusada', 'concluida'])->default('aberta');
            $table->decimal('preco_proposto', 10, 2)->nullable();
            $table->text('mensagem_inicial')->nullable();
            $table->timestamps();

            $table->index(['comprador_id', 'status']);
            $table->index(['vendedor_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('negociacoes');
    }
};
