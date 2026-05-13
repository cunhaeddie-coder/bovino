<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contador_acessos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('fazenda_id')->nullable()->constrained('fazendas')->nullOnDelete();
            $table->string('token', 64)->unique();
            $table->string('nome', 120)->nullable();
            $table->string('pin_hash', 255)->nullable();
            $table->tinyInteger('tentativas')->default(0);
            $table->timestamp('bloqueado_ate')->nullable();
            $table->string('sessao_token', 64)->nullable();
            $table->timestamp('sessao_expira_em')->nullable();
            $table->date('expira_em')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamp('ultimo_acesso')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contador_acessos');
    }
};
