<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sugestoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('titulo', 120);
            $table->text('descricao');
            $table->enum('categoria', ['funcionalidade', 'bug', 'usabilidade', 'desempenho', 'outro'])->default('funcionalidade');
            $table->enum('status', ['aberta', 'em_analise', 'aprovada', 'implementada', 'recusada'])->default('aberta');
            $table->enum('prioridade_admin', ['baixa', 'media', 'alta', 'critica'])->nullable();
            $table->text('resposta_admin')->nullable();
            $table->timestamp('respondida_em')->nullable();
            $table->timestamps();

            $table->index(['fazenda_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sugestoes');
    }
};
