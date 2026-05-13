<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Assinatura extends Model
{
    protected $table = 'assinaturas';

    protected $fillable = [
        'assinante_type', 'assinante_id', 'plano_id', 'status', 'periodo',
        'gateway', 'valor', 'gateway_id', 'gateway_subscription_id',
        'stripe_subscription_id', 'inicia_em', 'expira_em', 'cancelada_em',
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

    // Ativa a assinatura e sincroniza o campo plano no usuário.
    // Se $expiraEm for null, usa o período da assinatura (mensal/anual).
    public function ativar(?\Carbon\Carbon $expiraEm = null): void
    {
        if ($expiraEm === null) {
            $base = ($this->expira_em && $this->expira_em->isFuture())
                ? $this->expira_em
                : now();
            $expiraEm = $this->periodo === 'anual'
                ? $base->copy()->addYear()
                : $base->copy()->addMonth();
        }

        $this->update([
            'status'    => 'ativa',
            'inicia_em' => $this->inicia_em ?? now(),
            'expira_em' => $expiraEm,
        ]);

        $assinante = $this->assinante;
        if ($assinante && method_exists($assinante, 'update')) {
            $this->loadMissing('plano');
            $assinante->update(['plano' => $this->plano->slug]);
        }
    }
}
