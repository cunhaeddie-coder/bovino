<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Avaliacao extends Model
{
    protected $table = 'avaliacoes';

    protected $fillable = [
        'anuncio_id', 'vendedor_id', 'comprador_id',
        'nota', 'comentario', 'resposta_vendedor', 'negociacao_confirmada',
    ];

    protected $casts = [
        'nota'                   => 'integer',
        'negociacao_confirmada'  => 'boolean',
    ];

    public function anuncio(): BelongsTo
    {
        return $this->belongsTo(Anuncio::class);
    }

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    public function comprador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'comprador_id');
    }
}
