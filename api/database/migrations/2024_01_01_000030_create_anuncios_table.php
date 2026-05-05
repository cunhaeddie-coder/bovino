<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anuncios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('animal_id')->constrained('animais')->cascadeOnDelete();
            $table->string('titulo');
            $table->text('descricao')->nullable();
            $table->decimal('preco_unitario', 10, 2);
            $table->boolean('aceita_negociacao')->default(true);
            $table->boolean('destaque')->default(false);
            $table->unsignedBigInteger('views')->default(0);
            $table->timestamp('expira_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('destaque');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anuncios');
    }
};
