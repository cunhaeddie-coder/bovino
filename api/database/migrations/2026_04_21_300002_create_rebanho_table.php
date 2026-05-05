<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('rebanho', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pastagem_id')->nullable()->constrained('pastagens')->nullOnDelete();
            $table->string('brinco')->nullable();
            $table->string('sisbov')->nullable();
            $table->string('nome')->nullable();
            $table->string('raca');
            $table->enum('sexo', ['macho', 'femea']);
            $table->enum('categoria', ['bezerro', 'bezerra', 'novilho', 'novilha', 'touro', 'vaca', 'boi']);
            $table->date('data_nascimento')->nullable();
            $table->decimal('peso_atual', 8, 2)->nullable();
            $table->string('pai')->nullable();
            $table->string('mae')->nullable();
            $table->enum('status', ['ativo', 'vendido', 'morto', 'transferido'])->default('ativo');
            $table->text('observacao')->nullable();
            $table->timestamps();
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('rebanho');
    }
};
