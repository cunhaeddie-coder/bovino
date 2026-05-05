<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planos', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('nome');
            $table->enum('tipo', ['comprador', 'produtor', 'anunciante']);
            $table->decimal('preco', 10, 2);
            $table->enum('periodo', ['mensal', 'anual'])->default('mensal');
            $table->json('recursos');
            $table->unsignedSmallInteger('max_anuncios')->default(0); // 0 = ilimitado
            $table->unsignedSmallInteger('max_destaques')->default(0);
            $table->boolean('ver_contato_vendedor')->default(false);
            $table->boolean('alertas_preco')->default(false);
            $table->boolean('analytics')->default(false);
            $table->boolean('badge_verificado')->default(false);
            $table->boolean('suporte_prioritario')->default(false);
            $table->boolean('ativo')->default(true);
            $table->unsignedTinyInteger('ordem')->default(0);
            $table->timestamps();
        });

        Schema::create('assinaturas', function (Blueprint $table) {
            $table->id();
            $table->morphs('assinante'); // user ou anunciante
            $table->foreignId('plano_id')->constrained();
            $table->enum('status', ['pendente', 'ativa', 'cancelada', 'expirada'])->default('pendente');
            $table->decimal('valor', 10, 2);
            $table->string('gateway_id')->nullable(); // ID no Mercado Pago
            $table->string('gateway_subscription_id')->nullable();
            $table->timestamp('inicia_em')->nullable();
            $table->timestamp('expira_em')->nullable();
            $table->timestamp('cancelada_em')->nullable();
            $table->timestamps();

            $table->index(['assinante_type', 'assinante_id', 'status']);
        });

        Schema::create('pagamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assinatura_id')->constrained()->cascadeOnDelete();
            $table->decimal('valor', 10, 2);
            $table->enum('status', ['pendente', 'aprovado', 'recusado', 'reembolsado'])->default('pendente');
            $table->string('gateway_id')->nullable();
            $table->string('metodo')->nullable(); // pix, credit_card, boleto
            $table->json('gateway_response')->nullable();
            $table->timestamp('pago_em')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagamentos');
        Schema::dropIfExists('assinaturas');
        Schema::dropIfExists('planos');
    }
};
