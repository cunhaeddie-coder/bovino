<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pastagens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fazenda_id')->constrained()->cascadeOnDelete();
            $table->string('nome');
            $table->decimal('area_ha', 8, 2)->nullable();
            $table->decimal('capacidade_ua', 8, 2)->nullable();
            $table->string('tipo_capim')->nullable();
            $table->enum('status', ['livre', 'ocupada', 'descanso', 'reforma'])->default('livre');
            $table->text('observacao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pastagens');
    }
};
