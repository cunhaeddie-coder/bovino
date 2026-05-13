<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('atendimento_servicos', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->text('descricao')->nullable();
            $table->decimal('valor', 10, 2);
            $table->decimal('percentual_tecnico', 5, 2)->default(40.00); // % do valor cobrado ao cliente
            $table->decimal('duracao_horas', 4, 1)->default(2.0);
            $table->enum('modalidade', ['online', 'presencial', 'hibrido'])->default('online');
            $table->boolean('ativo')->default(true);
            $table->integer('ordem')->default(0);
            $table->timestamps();
        });

        Schema::create('ordens_atendimento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('servico_id')->constrained('atendimento_servicos');
            $table->foreignId('tecnico_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->enum('status', [
                'pendente',          // criada, aguardando aceite do técnico
                'aceita',            // técnico aceitou, aguardando data
                'agendada',          // data/hora definida
                'em_andamento',      // técnico iniciou
                'concluida',         // finalizada
                'recusada',          // técnico recusou
                'cancelada',         // admin ou cliente cancelou
            ])->default('pendente');
            $table->dateTime('data_hora')->nullable();
            $table->string('link_reuniao')->nullable();
            $table->text('observacoes')->nullable();
            $table->decimal('valor_cliente', 10, 2);
            $table->decimal('valor_tecnico', 10, 2);
            $table->boolean('pago_cliente')->default(false);
            $table->boolean('pago_tecnico')->default(false);
            $table->timestamps();
        });

        Schema::create('atendimento_registros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ordem_id')->constrained('ordens_atendimento')->cascadeOnDelete();
            $table->text('descricao');                          // o que foi feito
            $table->decimal('duracao_real', 4, 1)->nullable();  // horas efetivas
            $table->tinyInteger('avaliacao_cliente')->nullable(); // 1-5
            $table->text('proximos_passos')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('atendimento_registros');
        Schema::dropIfExists('ordens_atendimento');
        Schema::dropIfExists('atendimento_servicos');
    }
};
