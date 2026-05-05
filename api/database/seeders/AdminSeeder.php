<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        Admin::updateOrCreate(
            ['email' => 'admin@bovino.com.br'],
            [
                'nome'     => 'Super Admin',
                'password' => bcrypt('admin@2026'),
                'papel'    => 'super',
                'ativo'    => true,
            ]
        );
    }
}
