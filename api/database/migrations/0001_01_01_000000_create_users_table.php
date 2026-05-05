<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('cpf', 14)->unique();
            $table->string('celular', 20)->unique();
            $table->string('email')->unique()->nullable();
            $table->string('password');
            $table->enum('tipo', ['vendedor', 'comprador', 'ambos'])->default('comprador');
            $table->enum('plano', ['free', 'premium'])->default('free');
            $table->boolean('verificado_cpf')->default(false);
            $table->boolean('verificado_celular')->default(false);
            $table->string('estado', 2)->nullable();
            $table->string('municipio')->nullable();
            $table->string('avatar_url')->nullable();
            $table->timestamp('bloqueado_ate')->nullable();
            $table->integer('tentativas_login')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('ip', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('celular')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('access_logs');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
