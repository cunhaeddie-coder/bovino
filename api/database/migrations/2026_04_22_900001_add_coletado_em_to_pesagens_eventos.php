<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Registra quando o dado foi coletado no campo (pode ser diferente do created_at de sync)
        Schema::table('pesagens', function (Blueprint $table) {
            $table->timestamp('coletado_em')->nullable()->after('observacao');
        });

        Schema::table('eventos_campo', function (Blueprint $table) {
            $table->timestamp('coletado_em')->nullable()->after('resolucao');
        });
    }

    public function down(): void
    {
        Schema::table('pesagens',      fn (Blueprint $t) => $t->dropColumn('coletado_em'));
        Schema::table('eventos_campo', fn (Blueprint $t) => $t->dropColumn('coletado_em'));
    }
};
