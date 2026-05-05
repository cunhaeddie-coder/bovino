<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('alertas_demanda', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('raca')->nullable();
            $table->json('estados')->nullable();
            $table->string('categoria')->nullable();
            $table->string('sexo')->nullable();
            $table->decimal('peso_min', 8, 2)->nullable();
            $table->decimal('peso_max', 8, 2)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamp('ultimo_alerta_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertas_demanda');
    }
};
