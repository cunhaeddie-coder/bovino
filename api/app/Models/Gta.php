<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Gta extends Model
{
    protected $table = 'gtas';

    protected $fillable = [
        'fazenda_id', 'user_id', 'numero_gta', 'tipo', 'finalidade',
        'origem_nome', 'origem_municipio', 'origem_estado',
        'destino_nome', 'destino_municipio', 'destino_estado',
        'data_emissao', 'data_validade', 'qtd_animais', 'especie',
        'categorias', 'status', 'observacoes',
    ];

    protected $casts = [
        'data_emissao'  => 'date',
        'data_validade' => 'date',
        'qtd_animais'   => 'integer',
    ];

    public function fazenda(): BelongsTo
    {
        return $this->belongsTo(Fazenda::class);
    }
}
