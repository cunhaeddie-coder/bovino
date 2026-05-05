<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuscaLog extends Model
{
    protected $table = 'buscas_log';

    public $timestamps = false;

    protected $fillable = [
        'user_id', 'raca', 'estado', 'municipio', 'categoria',
        'sexo', 'peso_min', 'peso_max', 'preco_min', 'preco_max', 'ip',
    ];

    protected $casts = [
        'peso_min'   => 'float',
        'peso_max'   => 'float',
        'preco_min'  => 'float',
        'preco_max'  => 'float',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
