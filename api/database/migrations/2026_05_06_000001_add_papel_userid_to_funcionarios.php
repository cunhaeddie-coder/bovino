<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('funcionarios', function (Blueprint $table) {
            if (!Schema::hasColumn('funcionarios', 'papel')) {
                $table->string('papel', 30)->nullable()->after('cargo');
            }
            if (!Schema::hasColumn('funcionarios', 'user_id')) {
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()->after('fazenda_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('funcionarios', function (Blueprint $table) {
            if (Schema::hasColumn('funcionarios', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            }
            if (Schema::hasColumn('funcionarios', 'papel')) {
                $table->dropColumn('papel');
            }
        });
    }
};
