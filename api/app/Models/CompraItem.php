<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompraItem extends Model
{
    protected $table = 'compras_itens';
    protected $fillable = ['compra_id','insumo_id','quantidade','valor_unitario'];

    public function compra(): BelongsTo { return $this->belongsTo(CompraInsumo::class, 'compra_id'); }
    public function insumo(): BelongsTo { return $this->belongsTo(Insumo::class); }

    public function getSubtotalAttribute(): float { return $this->quantidade * $this->valor_unitario; }
}
