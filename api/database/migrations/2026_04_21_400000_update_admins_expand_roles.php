<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE admins MODIFY COLUMN papel ENUM('super','operador','ti','vendas','treinamento') NOT NULL DEFAULT 'operador'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE admins MODIFY COLUMN papel ENUM('super','operador') NOT NULL DEFAULT 'operador'");
    }
};
