<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lancamentos_fiscais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('fazenda_id')->nullable()->constrained('fazendas')->nullOnDelete();
            $table->enum('tipo', ['receita', 'despesa']);
            $table->string('categoria', 40);
            $table->decimal('valor', 12, 2);
            $table->date('data');
            $table->string('descricao', 500)->nullable();
            $table->unsignedBigInteger('vinculo_id')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'data']);
            $table->index(['fazenda_id', 'data']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lancamentos_fiscais');
    }
};
