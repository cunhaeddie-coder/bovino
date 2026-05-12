<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Converte ENUM('free','premium') para VARCHAR para suportar slugs completos
        Schema::table('users', function (Blueprint $table) {
            $table->string('plano', 60)->default('free')->change();
        });

        // Backfill: atualiza com o slug real do plano da assinatura ativa
        DB::statement("
            UPDATE users u
            INNER JOIN assinaturas a
                ON  a.assinante_id   = u.id
                AND a.assinante_type = 'App\\\\Models\\\\User'
                AND a.status         = 'ativa'
                AND (a.expira_em IS NULL OR a.expira_em > NOW())
            INNER JOIN planos p ON p.id = a.plano_id
            SET u.plano = p.slug
        ");
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('plano', ['free', 'premium'])->default('free')->change();
        });
    }
};
