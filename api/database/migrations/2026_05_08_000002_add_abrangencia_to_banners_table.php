<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->enum('abrangencia', ['nacional', 'estadual', 'municipal'])->default('nacional')->after('posicao');
            $table->json('estados')->nullable()->after('abrangencia');
            $table->json('municipios')->nullable()->after('estados');
        });
    }

    public function down(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->dropColumn(['abrangencia', 'estados', 'municipios']);
        });
    }
};
