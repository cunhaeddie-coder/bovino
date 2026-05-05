<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('animais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('raca');
            $table->enum('sexo', ['macho', 'femea', 'misto']);
            $table->unsignedSmallInteger('idade_meses')->nullable();
            $table->decimal('peso_estimado', 8, 2)->nullable();
            $table->unsignedInteger('quantidade')->default(1);
            $table->string('estado', 2);
            $table->string('municipio');
            $table->string('propriedade')->nullable();
            $table->enum('status', ['disponivel', 'vendido', 'reservado'])->default('disponivel');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('animais');
    }
};
