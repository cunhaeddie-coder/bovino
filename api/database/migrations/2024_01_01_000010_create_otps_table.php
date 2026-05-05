<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otps', function (Blueprint $table) {
            $table->id();
            $table->string('celular', 20)->index();
            $table->string('codigo', 6);
            $table->enum('finalidade', ['cadastro', 'login', 'recuperacao']);
            $table->boolean('usado')->default(false);
            $table->timestamp('expira_em');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otps');
    }
};
