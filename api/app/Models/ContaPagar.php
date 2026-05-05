<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class ContaPagar extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['fazenda_id','descricao','categoria','fornecedor_id','valor','vencimento','status','pago_em','forma_pagamento','observacoes','recorrente','user_id'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function fornecedor(): BelongsTo { return $this->belongsTo(Fornecedor::class); }

    public function getVencidaAttribute(): bool
    {
        return $this->status === 'pendente' && now()->startOfDay()->gt($this->vencimento);
    }
}
