<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('eventos_campo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained('fazendas')->cascadeOnDelete();
            $table->enum('tipo', ['nascimento','morte','acidente','doença','fuga','cobertura','parto','cio','outros']);
            $table->text('descricao');
            $table->foreignId('animal_id')->nullable()->constrained('rebanho')->nullOnDelete();
            $table->foreignId('lote_id')->nullable()->constrained('lotes_gestao')->nullOnDelete();
            $table->foreignId('pastagem_id')->nullable()->constrained('pastagens')->nullOnDelete();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('foto_url')->nullable();
            $table->foreignId('reportado_por')->constrained('users')->cascadeOnDelete();
            $table->timestamp('data_evento');
            $table->enum('urgencia', ['baixa','media','alta'])->default('media');
            $table->boolean('resolvido')->default(false);
            $table->text('resolucao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('eventos_campo'); }
};
