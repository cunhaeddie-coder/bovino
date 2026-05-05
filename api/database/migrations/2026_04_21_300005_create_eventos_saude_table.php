<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('eventos_saude', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained()->cascadeOnDelete();
            $table->foreignId('animal_id')->nullable()->constrained('rebanho')->nullOnDelete();
            $table->foreignId('lote_id')->nullable()->constrained('lotes_gestao')->nullOnDelete();
            $table->enum('tipo', ['vacina', 'vermifugo', 'tratamento', 'exame', 'cirurgia', 'outro']);
            $table->string('descricao');
            $table->string('produto')->nullable();
            $table->decimal('dose_ml', 8, 2)->nullable();
            $table->string('via_aplicacao')->nullable();
            $table->date('data_aplicacao');
            $table->date('proxima_dose')->nullable();
            $table->string('veterinario')->nullable();
            $table->decimal('custo', 10, 2)->nullable();
            $table->text('observacao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eventos_saude');
    }
};
