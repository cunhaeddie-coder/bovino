<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transacao extends Model
{
    protected $table = 'transacoes';

    protected $fillable = [
        'anuncio_id', 'comprador_id', 'vendedor_id',
        'raca', 'estado', 'municipio',
        'valor_por_arroba', 'qtd_cabecas', 'peso_total', 'valor_total',
        'confirmada_comprador', 'confirmada_vendedor',
    ];

    protected $casts = [
        'valor_por_arroba'      => 'float',
        'peso_total'            => 'float',
        'valor_total'           => 'float',
        'qtd_cabecas'           => 'integer',
        'confirmada_comprador'  => 'boolean',
        'confirmada_vendedor'   => 'boolean',
    ];

    public function anuncio(): BelongsTo
    {
        return $this->belongsTo(Anuncio::class);
    }

    public function comprador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'comprador_id');
    }

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }
}
