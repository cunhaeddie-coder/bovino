<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('anunciantes', function (Blueprint $table) {
            $table->string('cnpj', 18)->nullable()->unique()->after('empresa');
            $table->string('responsavel')->nullable()->after('cnpj');
            $table->string('celular', 20)->nullable()->after('responsavel');
            $table->string('password')->nullable()->after('celular');
            $table->string('logo_url')->nullable()->after('password');
            $table->string('site')->nullable()->after('logo_url');
            $table->string('estado', 2)->nullable()->after('site');
            $table->text('descricao')->nullable()->after('estado');
            $table->boolean('ativo')->default(false)->after('descricao');
            $table->foreignId('plano_id')->nullable()->constrained('planos')->nullOnDelete()->after('ativo');
            $table->dropColumn(['plano', 'validade']);
        });
    }

    public function down(): void
    {
        Schema::table('anunciantes', function (Blueprint $table) {
            $table->dropColumn(['cnpj','responsavel','celular','password','logo_url','site','estado','descricao','ativo','plano_id']);
            $table->string('plano');
            $table->date('validade');
        });
    }
};
