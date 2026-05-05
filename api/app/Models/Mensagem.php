<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Mensagem extends Model
{
    protected $table = 'mensagens';

    protected $fillable = [
        'negociacao_id',
        'remetente_id',
        'corpo',
        'lido_em',
    ];

    protected function casts(): array
    {
        return [
            'lido_em' => 'datetime',
        ];
    }

    public function negociacao(): BelongsTo
    {
        return $this->belongsTo(Negociacao::class);
    }

    public function remetente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'remetente_id');
    }
}
