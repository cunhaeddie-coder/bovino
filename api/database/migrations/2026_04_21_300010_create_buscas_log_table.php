<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('buscas_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('raca')->nullable();
            $table->string('estado', 2)->nullable();
            $table->string('municipio')->nullable();
            $table->string('categoria')->nullable();
            $table->string('sexo')->nullable();
            $table->decimal('peso_min', 8, 2)->nullable();
            $table->decimal('peso_max', 8, 2)->nullable();
            $table->decimal('preco_min', 10, 2)->nullable();
            $table->decimal('preco_max', 10, 2)->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buscas_log');
    }
};
