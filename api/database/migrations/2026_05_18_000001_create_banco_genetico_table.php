<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('banco_genetico', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained()->cascadeOnDelete();
            $table->string('touro_nome');
            $table->string('raca')->nullable();
            $table->string('rgd')->nullable();
            $table->string('fabricante')->nullable();
            $table->integer('qtd_doses_total')->default(0);
            $table->integer('qtd_doses_atual')->default(0);
            $table->string('partida')->nullable();
            $table->text('observacao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banco_genetico');
    }
};
