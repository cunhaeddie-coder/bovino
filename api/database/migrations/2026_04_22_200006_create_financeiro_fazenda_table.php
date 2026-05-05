<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('receitas_fazenda', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('descricao');
            $table->enum('categoria', ['venda_animais','venda_leite','arrendamento','servicos','subsidio','outros'])->default('outros');
            $table->decimal('valor', 12, 2);
            $table->date('data');
            $table->foreignId('lote_id')->nullable()->constrained('lotes_gestao')->nullOnDelete();
            $table->text('observacoes')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('contas_pagar', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('descricao');
            $table->string('categoria')->nullable();
            $table->foreignId('fornecedor_id')->nullable()->constrained('fornecedores')->nullOnDelete();
            $table->decimal('valor', 12, 2);
            $table->date('vencimento');
            $table->enum('status', ['pendente','pago','vencido','cancelado'])->default('pendente');
            $table->date('pago_em')->nullable();
            $table->enum('forma_pagamento', ['dinheiro','pix','boleto','cartao','cheque'])->nullable();
            $table->text('observacoes')->nullable();
            $table->boolean('recorrente')->default(false);
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('contas_receber', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('descricao');
            $table->string('cliente_nome')->nullable();
            $table->string('cliente_telefone', 20)->nullable();
            $table->decimal('valor', 12, 2);
            $table->date('vencimento');
            $table->enum('status', ['pendente','recebido','vencido','cancelado'])->default('pendente');
            $table->date('recebido_em')->nullable();
            $table->text('observacoes')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('contas_receber');
        Schema::dropIfExists('contas_pagar');
        Schema::dropIfExists('receitas_fazenda');
    }
};
