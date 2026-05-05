<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Otp extends Model
{
    protected $table = 'otps';

    public $timestamps = false;

    protected $fillable = [
        'celular',
        'codigo',
        'finalidade',
        'expira_em',
    ];

    protected function casts(): array
    {
        return [
            'usado' => 'boolean',
            'expira_em' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function estaValido(): bool
    {
        return !$this->usado && $this->expira_em->isFuture();
    }
}
