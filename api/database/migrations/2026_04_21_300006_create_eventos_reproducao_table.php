<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('eventos_reproducao', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained()->cascadeOnDelete();
            $table->foreignId('animal_id')->constrained('rebanho')->cascadeOnDelete(); // sempre referencia a fêmea
            $table->enum('tipo', ['cobertura', 'iatf', 'diagnostico_prenhez', 'parto', 'desmame', 'descarte']);
            $table->date('data_evento');
            $table->boolean('resultado')->nullable(); // prenha/vazia, vivo/morto
            $table->string('touro_brinco')->nullable();
            $table->string('semen_codigo')->nullable();
            $table->decimal('peso_bezerro', 6, 2)->nullable();
            $table->enum('sexo_bezerro', ['macho', 'femea'])->nullable();
            $table->foreignId('bezerro_id')->nullable()->constrained('rebanho')->nullOnDelete();
            $table->text('observacao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eventos_reproducao');
    }
};
