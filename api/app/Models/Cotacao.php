<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cotacao extends Model
{
    protected $table = 'cotacoes';

    public $timestamps = false;

    protected $fillable = [
        'tipo',
        'preco_arroba',
        'fonte',
        'estado',
        'referencia_em',
    ];

    protected function casts(): array
    {
        return [
            'preco_arroba' => 'float',
            'referencia_em' => 'date',
            'created_at' => 'datetime',
        ];
    }
}
