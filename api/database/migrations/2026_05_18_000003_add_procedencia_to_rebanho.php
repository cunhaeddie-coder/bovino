<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('rebanho', function (Blueprint $table) {
            $table->string('procedencia')->nullable()->after('raca');
        });
    }

    public function down(): void
    {
        Schema::table('rebanho', function (Blueprint $table) {
            $table->dropColumn('procedencia');
        });
    }
};
