<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gtas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->string('numero_gta', 60)->nullable();
            $table->enum('tipo', ['entrada', 'saida']);
            $table->enum('finalidade', ['venda', 'abate', 'reproducao', 'exposicao', 'pastagem', 'retorno', 'outros']);

            $table->string('origem_nome', 120)->nullable();
            $table->string('origem_municipio', 120)->nullable();
            $table->char('origem_estado', 2)->nullable();

            $table->string('destino_nome', 120)->nullable();
            $table->string('destino_municipio', 120)->nullable();
            $table->char('destino_estado', 2)->nullable();

            $table->date('data_emissao');
            $table->date('data_validade')->nullable();
            $table->unsignedSmallInteger('qtd_animais')->default(1);
            $table->string('especie', 40)->default('bovina');
            $table->string('categorias', 200)->nullable();

            $table->enum('status', ['emitida', 'em_transito', 'concluida', 'cancelada'])->default('emitida');
            $table->text('observacoes')->nullable();

            $table->timestamps();

            $table->index(['fazenda_id', 'status']);
            $table->index(['fazenda_id', 'data_emissao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gtas');
    }
};
