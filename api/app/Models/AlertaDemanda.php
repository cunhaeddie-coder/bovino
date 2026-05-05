<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertaDemanda extends Model
{
    protected $table = 'alertas_demanda';

    protected $fillable = [
        'user_id', 'raca', 'estados', 'categoria', 'sexo',
        'peso_min', 'peso_max', 'ativo', 'ultimo_alerta_at',
    ];

    protected $casts = [
        'estados'         => 'array',
        'ativo'           => 'boolean',
        'peso_min'        => 'float',
        'peso_max'        => 'float',
        'ultimo_alerta_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
