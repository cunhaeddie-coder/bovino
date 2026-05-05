<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('trocas_piquete', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->foreignId('lote_id')->constrained('lotes_gestao')->cascadeOnDelete();
            $table->foreignId('pastagem_origem_id')->nullable()->constrained('pastagens')->nullOnDelete();
            $table->foreignId('pastagem_destino_id')->constrained('pastagens')->cascadeOnDelete();
            $table->date('data_troca');
            $table->integer('dias_descanso_origem')->nullable();
            $table->text('observacoes')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('aplicacoes_nutricionais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('descricao');
            $table->enum('tipo', ['suplemento','mineral','racao','sal','outro'])->default('suplemento');
            $table->foreignId('insumo_id')->nullable()->constrained('insumos')->nullOnDelete();
            $table->decimal('quantidade_total', 10, 3);
            $table->string('unidade', 20);
            $table->decimal('custo_total', 10, 2)->nullable();
            $table->date('data_aplicacao');
            $table->foreignId('lote_id')->nullable()->constrained('lotes_gestao')->nullOnDelete();
            $table->foreignId('pastagem_id')->nullable()->constrained('pastagens')->nullOnDelete();
            $table->text('observacoes')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('templates_coleta', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('nome');
            $table->string('descricao')->nullable();
            $table->json('campos');
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });

        Schema::create('registros_coleta', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('templates_coleta')->cascadeOnDelete();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->json('dados');
            $table->foreignId('animal_id')->nullable()->constrained('rebanho')->nullOnDelete();
            $table->foreignId('lote_id')->nullable()->constrained('lotes_gestao')->nullOnDelete();
            $table->foreignId('pastagem_id')->nullable()->constrained('pastagens')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('data_coleta');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('registros_coleta');
        Schema::dropIfExists('templates_coleta');
        Schema::dropIfExists('aplicacoes_nutricionais');
        Schema::dropIfExists('trocas_piquete');
    }
};
