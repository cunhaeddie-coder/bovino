<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lotes_gestao', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained()->cascadeOnDelete();
            $table->foreignId('anuncio_id')->nullable()->constrained()->nullOnDelete();
            $table->string('nome');
            $table->string('raca')->nullable();
            $table->enum('categoria', ['bezerro', 'novilho', 'novilha', 'boi_gordo', 'vaca', 'touro', 'misto']);
            $table->integer('qtd_cabecas')->default(0);
            $table->decimal('peso_medio', 8, 2)->nullable();
            $table->decimal('preco_arroba', 10, 2)->nullable();
            $table->enum('status', ['disponivel', 'reservado', 'vendido', 'interno'])->default('disponivel');
            $table->text('observacao')->nullable();
            $table->timestamps();
        });

        Schema::create('rebanho_lote', function (Blueprint $table) {
            $table->foreignId('rebanho_id')->constrained('rebanho')->cascadeOnDelete();
            $table->foreignId('lote_id')->constrained('lotes_gestao')->cascadeOnDelete();
            $table->primary(['rebanho_id', 'lote_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rebanho_lote');
        Schema::dropIfExists('lotes_gestao');
    }
};
