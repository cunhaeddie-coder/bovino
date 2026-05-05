<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Assinatura extends Model
{
    protected $table = 'assinaturas';

    protected $fillable = [
        'assinante_type', 'assinante_id', 'plano_id', 'status',
        'valor', 'gateway_id', 'gateway_subscription_id',
        'inicia_em', 'expira_em', 'cancelada_em',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'float',
            'inicia_em' => 'datetime',
            'expira_em' => 'datetime',
            'cancelada_em' => 'datetime',
        ];
    }

    public function assinante(): MorphTo
    {
        return $this->morphTo();
    }

    public function plano(): BelongsTo
    {
        return $this->belongsTo(Plano::class);
    }

    public function pagamentos(): HasMany
    {
        return $this->hasMany(Pagamento::class);
    }

    public function estaAtiva(): bool
    {
        return $this->status === 'ativa'
            && ($this->expira_em === null || $this->expira_em->isFuture());
    }
}
