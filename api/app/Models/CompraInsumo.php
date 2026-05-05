<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToFazenda;

class CompraInsumo extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['fazenda_id','fornecedor_id','data_compra','valor_total','status','nota_fiscal','forma_pagamento','data_vencimento','observacoes','user_id'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function fornecedor(): BelongsTo { return $this->belongsTo(Fornecedor::class); }
    public function itens(): HasMany { return $this->hasMany(CompraItem::class, 'compra_id'); }
    public function movimentacoes(): HasMany { return $this->hasMany(MovimentacaoEstoque::class, 'compra_id'); }
}
