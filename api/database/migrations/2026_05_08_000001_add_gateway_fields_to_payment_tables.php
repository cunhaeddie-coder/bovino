<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planos', function (Blueprint $table) {
            $table->string('stripe_price_id')->nullable()->after('periodo');
        });

        Schema::table('assinaturas', function (Blueprint $table) {
            $table->string('gateway')->default('mercadopago')->after('status');
            $table->string('stripe_subscription_id')->nullable()->after('gateway_subscription_id');
        });

        Schema::table('pagamentos', function (Blueprint $table) {
            $table->string('gateway')->default('mercadopago')->after('assinatura_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('stripe_customer_id')->nullable()->after('avatar_url');
        });

        Schema::table('anunciantes', function (Blueprint $table) {
            $table->string('stripe_customer_id')->nullable()->after('plano_id');
        });
    }

    public function down(): void
    {
        Schema::table('planos', fn (Blueprint $t) => $t->dropColumn('stripe_price_id'));
        Schema::table('assinaturas', fn (Blueprint $t) => $t->dropColumn(['gateway', 'stripe_subscription_id']));
        Schema::table('pagamentos', fn (Blueprint $t) => $t->dropColumn('gateway'));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('stripe_customer_id'));
        Schema::table('anunciantes', fn (Blueprint $t) => $t->dropColumn('stripe_customer_id'));
    }
};
