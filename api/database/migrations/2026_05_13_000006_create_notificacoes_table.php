<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('tipo', 40);
            $table->string('titulo', 200);
            $table->string('corpo', 500)->nullable();
            $table->string('link', 300)->nullable();
            $table->boolean('lida')->default(false);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'lida', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificacoes');
    }
};
