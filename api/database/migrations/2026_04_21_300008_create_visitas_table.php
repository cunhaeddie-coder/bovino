<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('visitas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anuncio_id')->constrained()->cascadeOnDelete();
            $table->foreignId('comprador_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vendedor_id')->constrained('users')->cascadeOnDelete();
            $table->date('data_solicitada');
            $table->time('hora_solicitada')->nullable();
            $table->enum('status', ['pendente', 'confirmada', 'recusada', 'cancelada', 'realizada'])->default('pendente');
            $table->text('mensagem')->nullable();
            $table->text('resposta')->nullable();
            $table->date('data_confirmada')->nullable();
            $table->time('hora_confirmada')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitas');
    }
};
