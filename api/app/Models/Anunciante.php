<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Anunciante extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'empresa', 'cnpj', 'responsavel', 'celular', 'email',
        'password', 'logo_url', 'site', 'estado', 'descricao',
        'ativo', 'plano_id',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'ativo' => 'boolean',
        ];
    }

    public function plano(): BelongsTo
    {
        return $this->belongsTo(Plano::class);
    }

    public function banners(): HasMany
    {
        return $this->hasMany(Banner::class);
    }

    public function assinaturas(): MorphMany
    {
        return $this->morphMany(Assinatura::class, 'assinante');
    }

    public function assinaturaAtiva(): ?Assinatura
    {
        return $this->assinaturas()
            ->where('status', 'ativa')
            ->where(fn($q) => $q->whereNull('expira_em')->orWhere('expira_em', '>', now()))
            ->with('plano')
            ->latest()
            ->first();
    }

    public function estaAtivo(): bool
    {
        return $this->ativo && $this->assinaturaAtiva() !== null;
    }
}
