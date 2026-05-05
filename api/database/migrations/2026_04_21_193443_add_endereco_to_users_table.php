<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('cep', 9)->nullable()->after('municipio');
            $table->string('endereco')->nullable()->after('cep');
            $table->string('numero', 20)->nullable()->after('endereco');
            $table->string('complemento', 100)->nullable()->after('numero');
            $table->string('bairro')->nullable()->after('complemento');
            $table->string('nome_propriedade')->nullable()->after('bairro');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['cep', 'endereco', 'numero', 'complemento', 'bairro', 'nome_propriedade']);
        });
    }
};
