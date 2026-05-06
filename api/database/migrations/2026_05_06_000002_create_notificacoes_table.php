<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('notificacoes')) {
            Schema::create('notificacoes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('tipo');
                $table->string('titulo');
                $table->text('corpo')->nullable();
                $table->string('link')->nullable();
                $table->string('referencia_tipo')->nullable();
                $table->unsignedBigInteger('referencia_id')->nullable();
                $table->timestamp('lida_em')->nullable();
                $table->timestamps();
                $table->index(['user_id', 'lida_em']);
            });
        }

        Schema::table('funcionarios', function (Blueprint $table) {
            if (!Schema::hasColumn('funcionarios', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('id')
                    ->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('funcionarios', 'papel')) {
                $table->enum('papel', ['vaqueiro', 'veterinario', 'gerente', 'outro'])
                    ->default('outro')->after('cargo');
            }
        });
    }

    public function down(): void
    {
        Schema::table('funcionarios', function (Blueprint $table) {
            if (Schema::hasColumn('funcionarios', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            }
            if (Schema::hasColumn('funcionarios', 'papel')) {
                $table->dropColumn('papel');
            }
        });
        Schema::dropIfExists('notificacoes');
    }
};
