<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('planos_nutricionais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained()->cascadeOnDelete();
            $table->string('nome');
            $table->enum('categoria', ['bezerro','novilho','novilha','boi_gordo','vaca','touro','misto'])->default('misto');
            $table->decimal('custo_diario_animal', 8, 2)->nullable();
            $table->text('descricao')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });

        Schema::create('plano_nutricional_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plano_id')->constrained('planos_nutricionais')->cascadeOnDelete();
            $table->string('ingrediente');
            $table->decimal('quantidade_por_animal', 8, 3);
            $table->string('unidade')->default('kg');
            $table->decimal('custo_estimado', 8, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plano_nutricional_itens');
        Schema::dropIfExists('planos_nutricionais');
    }
};
