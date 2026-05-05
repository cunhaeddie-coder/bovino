<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Visita extends Model
{
    protected $fillable = [
        'anuncio_id', 'comprador_id', 'vendedor_id',
        'data_solicitada', 'hora_solicitada', 'status',
        'mensagem', 'resposta', 'data_confirmada', 'hora_confirmada',
    ];

    protected $casts = [
        'data_solicitada' => 'date',
        'data_confirmada' => 'date',
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
