<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFazenda;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Arrendamento extends Model
{
    use BelongsToFazenda;

    protected $fillable = [
        'fazenda_id',
        'tipo',
        'nome_propriedade',
        'contraparte_nome',
        'contato',
        'estado',
        'municipio',
        'area_hectares',
        'valor_mensal',
        'tipo_pagamento',
        'dia_vencimento',
        'data_inicio',
        'data_fim',
        'status',
        'observacoes',
    ];

    protected $casts = [
        'data_inicio'   => 'date',
        'data_fim'      => 'date',
        'area_hectares' => 'float',
        'valor_mensal'  => 'float',
    ];

    public function fazenda(): BelongsTo
    {
        return $this->belongsTo(Fazenda::class);
    }

    public function vencendoEm(int $dias = 30): bool
    {
        if (!$this->data_fim || $this->status !== 'ativo') return false;
        $diff = now()->startOfDay()->diffInDays($this->data_fim, false);
        return $diff >= 0 && $diff <= $dias;
    }

    public function vencido(): bool
    {
        if (!$this->data_fim) return false;
        return $this->data_fim->isPast() && $this->status === 'ativo';
    }
}
