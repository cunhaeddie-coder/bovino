<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class EstoqueInsumo extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['insumo_id','fazenda_id','quantidade_atual','quantidade_minima','localizacao','validade'];

    protected $casts = [
        'quantidade_atual'  => 'float',
        'quantidade_minima' => 'float',
    ];

    public function insumo(): BelongsTo { return $this->belongsTo(Insumo::class); }
    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }

    public function getAbaixoMinimoAttribute(): bool
    {
        return $this->quantidade_atual <= $this->quantidade_minima;
    }
}
