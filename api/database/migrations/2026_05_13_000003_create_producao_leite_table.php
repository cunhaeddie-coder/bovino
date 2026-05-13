<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('producao_leite', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('data');
            $table->decimal('litros_manha', 8, 2)->default(0);
            $table->decimal('litros_tarde', 8, 2)->default(0);
            $table->decimal('litros_noite', 8, 2)->default(0);
            $table->decimal('preco_litro', 6, 4)->default(0);
            $table->string('observacao', 500)->nullable();
            $table->timestamps();

            $table->unique(['fazenda_id', 'data']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producao_leite');
    }
};
