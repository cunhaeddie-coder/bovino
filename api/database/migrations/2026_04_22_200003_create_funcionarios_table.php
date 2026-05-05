<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('funcionarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('nome');
            $table->string('cpf', 14)->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('cargo');
            $table->decimal('salario', 10, 2)->nullable();
            $table->date('data_admissao');
            $table->date('data_demissao')->nullable();
            $table->enum('tipo_contrato', ['clt','pj','temporario','diarista'])->default('clt');
            $table->text('observacoes')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });

        Schema::create('prestadores_servico', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('nome');
            $table->string('cnpj_cpf', 20)->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('especialidade');
            $table->decimal('valor_hora', 10, 2)->nullable();
            $table->decimal('valor_diaria', 10, 2)->nullable();
            $table->text('observacoes')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('prestadores_servico');
        Schema::dropIfExists('funcionarios');
    }
};
