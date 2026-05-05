<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustoSaas extends Model
{
    protected $table = 'custos_saas';

    protected $fillable = [
        'descricao', 'categoria', 'valor', 'recorrencia',
        'data_vencimento', 'ativo', 'observacao',
    ];

    protected function casts(): array
    {
        return [
            'valor'            => 'float',
            'ativo'            => 'boolean',
            'data_vencimento'  => 'date',
        ];
    }

    /** Valor mensal normalizado para cálculo de MRC */
    public function getValorMensalAttribute(): float
    {
        return match ($this->recorrencia) {
            'anual'  => round($this->valor / 12, 2),
            'unico'  => 0,
            default  => $this->valor,
        };
    }
}
