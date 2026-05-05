<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mensagens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negociacao_id')->constrained('negociacoes')->cascadeOnDelete();
            $table->foreignId('remetente_id')->constrained('users')->cascadeOnDelete();
            $table->text('corpo');
            $table->timestamp('lido_em')->nullable();
            $table->timestamps();

            $table->index(['negociacao_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mensagens');
    }
};
