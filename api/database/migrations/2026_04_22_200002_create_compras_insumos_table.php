<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('compras_insumos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->foreignId('fornecedor_id')->nullable()->constrained('fornecedores')->nullOnDelete();
            $table->date('data_compra');
            $table->decimal('valor_total', 12, 2)->default(0);
            $table->enum('status', ['rascunho','confirmada','entregue','cancelada'])->default('confirmada');
            $table->string('nota_fiscal')->nullable();
            $table->enum('forma_pagamento', ['dinheiro','pix','boleto','cartao','cheque','prazo'])->nullable();
            $table->date('data_vencimento')->nullable();
            $table->text('observacoes')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('compras_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('compra_id')->constrained('compras_insumos')->cascadeOnDelete();
            $table->foreignId('insumo_id')->constrained('insumos')->cascadeOnDelete();
            $table->decimal('quantidade', 10, 3);
            $table->decimal('valor_unitario', 10, 2);
            $table->timestamps();
        });

        Schema::create('movimentacoes_estoque', function (Blueprint $table) {
            $table->id();
            $table->foreignId('insumo_id')->constrained('insumos')->cascadeOnDelete();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->enum('tipo', ['entrada','saida','ajuste','perda']);
            $table->decimal('quantidade', 10, 3);
            $table->decimal('custo_unitario', 10, 2)->nullable();
            $table->string('motivo')->nullable();
            $table->foreignId('compra_id')->nullable()->constrained('compras_insumos')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void {
        Schema::dropIfExists('movimentacoes_estoque');
        Schema::dropIfExists('compras_itens');
        Schema::dropIfExists('compras_insumos');
    }
};
