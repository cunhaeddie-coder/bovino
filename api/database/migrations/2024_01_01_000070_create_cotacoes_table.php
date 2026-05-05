<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cotacoes', function (Blueprint $table) {
            $table->id();
            $table->enum('tipo', ['boi_gordo', 'bezerro', 'vaca']);
            $table->decimal('preco_arroba', 8, 2);
            $table->string('fonte');
            $table->string('estado', 2)->nullable();
            $table->date('referencia_em');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tipo', 'referencia_em']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cotacoes');
    }
};
