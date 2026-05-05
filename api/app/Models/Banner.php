<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Banner extends Model
{
    protected $fillable = [
        'anunciante_id',
        'imagem_url',
        'link_url',
        'posicao',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
            'cliques' => 'integer',
            'impressoes' => 'integer',
        ];
    }

    public function anunciante(): BelongsTo
    {
        return $this->belongsTo(Anunciante::class);
    }
}
