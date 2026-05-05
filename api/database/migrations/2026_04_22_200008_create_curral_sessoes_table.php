<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('sessoes_curral', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('data_sessao');
            $table->string('descricao')->nullable();
            $table->enum('status', ['ativa','sincronizada','erro'])->default('ativa');
            $table->json('dados_offline')->nullable();
            $table->integer('total_animais')->default(0);
            $table->timestamp('sincronizado_em')->nullable();
            $table->timestamps();
        });

        Schema::create('conversas_ia', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('mensagem');
            $table->text('resposta');
            $table->enum('tipo', ['texto','audio'])->default('texto');
            $table->json('contexto')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('conversas_ia');
        Schema::dropIfExists('sessoes_curral');
    }
};
