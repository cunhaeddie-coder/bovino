<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rebanho', function (Blueprint $table) {
            $table->enum('status_leiteiro', ['em_lactacao', 'seca'])
                ->nullable()
                ->default(null)
                ->after('categoria');
        });
    }

    public function down(): void
    {
        Schema::table('rebanho', function (Blueprint $table) {
            $table->dropColumn('status_leiteiro');
        });
    }
};
