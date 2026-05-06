<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ordens_servico', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('nome');
            $table->enum('finalidade', [
                'desmama',
                'vacinacao',
                'pesagem',
                'transferencia_pasto',
                'engorda',
                'iatf',
                'cobertura',
                'diagnostico_prenhez',
                'descarte',
                'venda_marketplace',
                'venda_direta',
                'frigorifico',
                'marcacao_brinco',
                'outro',
            ]);
            $table->enum('status', [
                'rascunho',
                'aguardando',
                'em_andamento',
                'parcial',
                'concluido',
                'cancelado',
            ])->default('rascunho');
            $table->foreignId('criado_por')->constrained('users');
            $table->foreignId('atribuido_a')->nullable()->constrained('funcionarios')->nullOnDelete();
            $table->foreignId('pastagem_destino_id')->nullable()->constrained('pastagens')->nullOnDelete();
            $table->text('instrucoes')->nullable();
            $table->timestamp('publicado_em')->nullable();
            $table->timestamp('executado_em')->nullable();
            $table->timestamps();

            $table->index(['fazenda_id', 'status']);
        });

        Schema::create('ordem_servico_animais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ordem_servico_id')->constrained('ordens_servico')->cascadeOnDelete();
            $table->foreignId('animal_id')->constrained('rebanho')->cascadeOnDelete();
            $table->enum('status', ['pendente', 'feito', 'nao_realizado'])->default('pendente');
            $table->foreignId('pastagem_destino_id')->nullable()->constrained('pastagens')->nullOnDelete();
            $table->decimal('peso_execucao', 8, 2)->nullable();
            $table->string('observacao')->nullable();
            $table->foreignId('executado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('executado_em')->nullable();
            $table->unique(['ordem_servico_id', 'animal_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordem_servico_animais');
        Schema::dropIfExists('ordens_servico');
    }
};
