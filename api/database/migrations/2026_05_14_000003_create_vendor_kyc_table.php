<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_kyc', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();

            // Dados pessoais/empresa
            $table->string('cpf_cnpj', 18);
            $table->string('tipo_documento', 4)->default('cpf'); // cpf | cnpj

            // Dados da propriedade
            $table->string('inscricao_estadual', 30)->nullable();
            $table->string('car_numero', 50)->nullable();
            $table->string('estado_propriedade', 2)->nullable();

            // Documento + selfie (para BaaS)
            $table->string('documento_frente_url')->nullable();
            $table->string('documento_verso_url')->nullable();
            $table->string('selfie_url')->nullable();

            // Status das verificações
            $table->enum('kyc_status', ['pendente', 'validando', 'aprovado', 'reprovado', 'revisao_manual'])->default('pendente');
            $table->enum('status_receita',  ['nao_verificado', 'ok', 'invalido', 'inativo'])->default('nao_verificado');
            $table->enum('status_ie',       ['nao_verificado', 'ok', 'invalido', 'nao_autorizada'])->default('nao_verificado');
            $table->enum('status_ibama',    ['nao_verificado', 'ok', 'embargado'])->default('nao_verificado');
            $table->enum('status_selfie',   ['nao_verificado', 'ok', 'reprovado'])->default('nao_verificado');

            // Dados retornados pelas APIs
            $table->string('nome_receita')->nullable();
            $table->json('dados_receita')->nullable();
            $table->text('motivo_reprovacao')->nullable();

            $table->timestamp('aprovado_em')->nullable();
            $table->timestamp('verificado_receita_em')->nullable();
            $table->timestamp('verificado_ibama_em')->nullable();
            $table->timestamps();

            $table->index('kyc_status');
        });

        Schema::create('ibama_embargos', function (Blueprint $table) {
            $table->id();
            $table->string('cpf_cnpj', 18)->index();
            $table->string('nome')->nullable();
            $table->string('municipio', 120)->nullable();
            $table->string('estado', 2)->nullable();
            $table->string('num_tad', 60)->nullable();
            $table->enum('situacao', ['ativo', 'cancelado'])->default('ativo');
            $table->date('data_embargo')->nullable();
            $table->timestamp('importado_em')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_kyc');
        Schema::dropIfExists('ibama_embargos');
    }
};
