<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('tipo'); // ordem_servico | alerta_rebanho | sistema
            $table->string('titulo');
            $table->text('corpo')->nullable();
            $table->string('link')->nullable();
            $table->string('referencia_tipo')->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->timestamp('lida_em')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'lida_em']);
        });

        // Adiciona coluna user_id aos funcionários para acesso futuro do vaqueiro
        Schema::table('funcionarios', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')
                ->constrained('users')->nullOnDelete();
            $table->enum('papel', ['vaqueiro', 'veterinario', 'gerente', 'outro'])
                ->default('outro')->after('cargo');
        });
    }

    public function down(): void
    {
        Schema::table('funcionarios', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'papel']);
        });
        Schema::dropIfExists('notificacoes');
    }
};
