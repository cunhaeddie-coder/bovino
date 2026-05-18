<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class BancoGenetico extends Model
{
    use BelongsToFazenda;

    protected $table = 'banco_genetico';

    protected $fillable = [
        'fazenda_id', 'touro_nome', 'raca', 'rgd',
        'fabricante', 'qtd_doses_total', 'qtd_doses_atual',
        'partida', 'observacao',
    ];

    protected $casts = [
        'qtd_doses_total' => 'integer',
        'qtd_doses_atual' => 'integer',
    ];

    public function fazenda(): BelongsTo
    {
        return $this->belongsTo(Fazenda::class);
    }
}
