<?php
use App\Models\Admin;
use Illuminate\Support\Facades\Hash;

$admin = Admin::where('email', 'admin@bovino.com.br')->first();
if ($admin) {
    echo "Admin existe: " . $admin->email . "\n";
    echo "Ativo: " . ($admin->ativo ? 'sim' : 'nao') . "\n";
    echo "Senha ok: " . (Hash::check('admin@2026', $admin->password) ? 'SIM' : 'NAO - vou corrigir') . "\n";
} else {
    echo "NAO existe - vou criar\n";
}
