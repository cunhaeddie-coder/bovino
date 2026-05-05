<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('fornecedores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('nome');
            $table->string('cnpj_cpf', 20)->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('email')->nullable();
            $table->enum('categoria', ['insumos','medicamentos','servicos','equipamentos','outros'])->default('insumos');
            $table->string('contato_nome')->nullable();
            $table->string('estado', 2)->nullable();
            $table->string('municipio')->nullable();
            $table->text('observacoes')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('fornecedores'); }
};
