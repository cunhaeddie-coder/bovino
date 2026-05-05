<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('insumos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('nome');
            $table->string('codigo')->nullable();
            $table->enum('categoria', ['medicamento','vacina','nutricional','mineral','combustivel','ferramenta','semente','agrotóxico','outros'])->default('outros');
            $table->enum('unidade', ['kg','g','L','mL','un','sc','cx','dose','frasco'])->default('un');
            $table->decimal('preco_unitario', 10, 2)->nullable();
            $table->foreignId('fornecedor_padrao_id')->nullable()->constrained('fornecedores')->nullOnDelete();
            $table->text('descricao')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });

        Schema::create('estoque_insumos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('insumo_id')->constrained('insumos')->cascadeOnDelete();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->decimal('quantidade_atual', 10, 3)->default(0);
            $table->decimal('quantidade_minima', 10, 3)->default(0);
            $table->string('localizacao')->nullable();
            $table->date('validade')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('estoque_insumos');
        Schema::dropIfExists('insumos');
    }
};
