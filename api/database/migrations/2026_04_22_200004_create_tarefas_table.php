<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('tarefas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->string('titulo');
            $table->text('descricao')->nullable();
            $table->enum('tipo', ['manejo','saude','pastagem','infraestrutura','nutricao','outros'])->default('manejo');
            $table->enum('prioridade', ['baixa','media','alta','urgente'])->default('media');
            $table->enum('status', ['pendente','em_andamento','concluida','cancelada'])->default('pendente');
            $table->date('data_prevista')->nullable();
            $table->timestamp('data_conclusao')->nullable();
            $table->nullableMorphs('responsavel');
            $table->foreignId('lote_id')->nullable()->constrained('lotes_gestao')->nullOnDelete();
            $table->foreignId('pastagem_id')->nullable()->constrained('pastagens')->nullOnDelete();
            $table->foreignId('criado_por')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('tarefas'); }
};
