<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suporte_conversas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('user_nome', 120);
            $table->string('user_plano', 60)->default('free');
            $table->string('fazenda_nome', 200)->nullable();
            $table->enum('status', ['aberta', 'em_atendimento', 'resolvida', 'escalada'])->default('aberta');
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->string('resumo', 200)->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('user_id');
        });

        Schema::create('suporte_mensagens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversa_id')->constrained('suporte_conversas')->cascadeOnDelete();
            $table->enum('papel', ['usuario', 'ia', 'admin']);
            $table->text('conteudo');
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suporte_mensagens');
        Schema::dropIfExists('suporte_conversas');
    }
};
