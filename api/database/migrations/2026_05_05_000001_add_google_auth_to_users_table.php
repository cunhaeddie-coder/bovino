<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->unique()->after('id');
            $table->string('cpf', 14)->nullable()->change();
            $table->string('celular', 20)->nullable()->change();
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('google_id');
            $table->string('cpf', 14)->nullable(false)->change();
            $table->string('celular', 20)->nullable(false)->change();
            $table->string('password')->nullable(false)->change();
        });
    }
};
