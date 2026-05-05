<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custos_saas', function (Blueprint $table) {
            $table->id();
            $table->string('descricao');
            $table->enum('categoria', ['hosting', 'apis', 'ferramentas', 'marketing', 'pessoal', 'juridico', 'outro'])->default('outro');
            $table->decimal('valor', 10, 2);
            $table->enum('recorrencia', ['mensal', 'anual', 'unico'])->default('mensal');
            $table->date('data_vencimento')->nullable();
            $table->boolean('ativo')->default(true);
            $table->text('observacao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custos_saas');
    }
};
