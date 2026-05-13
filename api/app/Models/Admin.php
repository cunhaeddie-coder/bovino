<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Admin extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'nome', 'email', 'password', 'papel', 'tipo_contrato', 'ativo', 'ultimo_acesso',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'password'      => 'hashed',
            'ativo'         => 'boolean',
            'ultimo_acesso' => 'datetime',
        ];
    }

    public function isSuperAdmin(): bool
    {
        return $this->papel === 'super';
    }
}
