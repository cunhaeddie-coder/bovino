<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sugestao extends Model
{
    protected $table = 'sugestoes';

    protected $fillable = [
        'user_id', 'fazenda_id', 'titulo', 'descricao', 'categoria',
        'status', 'prioridade_admin', 'resposta_admin', 'respondida_em',
    ];

    protected $casts = [
        'respondida_em' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fazenda(): BelongsTo
    {
        return $this->belongsTo(Fazenda::class);
    }
}
