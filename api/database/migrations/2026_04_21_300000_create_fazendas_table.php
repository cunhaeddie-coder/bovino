<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('fazendas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('nome');
            $table->string('slug')->unique();
            $table->string('logo_url')->nullable();
            $table->json('fotos')->nullable();
            $table->text('descricao')->nullable();
            $table->string('estado', 2);
            $table->string('municipio');
            $table->decimal('area_ha', 10, 2)->nullable();
            $table->string('gta_numero')->nullable();
            $table->string('sisbov_numero')->nullable();
            $table->string('website')->nullable();
            $table->string('whatsapp')->nullable();
            $table->integer('anos_atividade')->nullable();
            $table->json('racas_principais')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fazendas');
    }
};
