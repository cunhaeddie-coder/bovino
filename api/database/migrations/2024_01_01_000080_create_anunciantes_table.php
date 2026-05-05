<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anunciantes', function (Blueprint $table) {
            $table->id();
            $table->string('empresa');
            $table->string('contato');
            $table->string('email')->nullable();
            $table->enum('plano', ['basico', 'premium']);
            $table->date('validade');
            $table->timestamps();
        });

        Schema::create('banners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anunciante_id')->constrained()->cascadeOnDelete();
            $table->string('imagem_url');
            $table->string('link_url')->nullable();
            $table->enum('posicao', ['feed', 'busca', 'home']);
            $table->unsignedBigInteger('cliques')->default(0);
            $table->unsignedBigInteger('impressoes')->default(0);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banners');
        Schema::dropIfExists('anunciantes');
    }
};
