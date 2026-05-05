<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('custos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lote_id')->nullable()->constrained('lotes_gestao')->nullOnDelete();
            $table->foreignId('animal_id')->nullable()->constrained('animais')->nullOnDelete();
            $table->enum('categoria', ['aquisicao', 'alimentacao', 'saude', 'mao_de_obra', 'transporte', 'outros']);
            $table->string('descricao');
            $table->decimal('valor', 12, 2);
            $table->date('data');
            $table->string('nota_fiscal')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custos');
    }
};
