<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'google_id',
        'nome',
        'cpf',
        'celular',
        'email',
        'password',
        'tipo',
        'plano',
        'verificado_cpf',
        'verificado_celular',
        'estado',
        'municipio',
        'cep',
        'endereco',
        'numero',
        'complemento',
        'bairro',
        'nome_propriedade',
        'avatar_url',
        'stripe_customer_id',
        'onboarding_etapa',
    ];

    protected $hidden = [
        'password',
        'tentativas_login',
        'bloqueado_ate',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'verificado_cpf' => 'boolean',
            'verificado_celular' => 'boolean',
            'bloqueado_ate' => 'datetime',
        ];
    }

    public function animais(): HasMany
    {
        return $this->hasMany(Animal::class);
    }

    public function anuncios(): HasMany
    {
        return $this->hasMany(Anuncio::class);
    }

    public function negociacoesComoComprador(): HasMany
    {
        return $this->hasMany(Negociacao::class, 'comprador_id');
    }

    public function negociacoesComoVendedor(): HasMany
    {
        return $this->hasMany(Negociacao::class, 'vendedor_id');
    }

    public function assinaturas(): \Illuminate\Database\Eloquent\Relations\MorphMany
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

    public function fazenda(): HasOne
    {
        return $this->hasOne(Fazenda::class);
    }

    public function alertasDemanda(): HasMany
    {
        return $this->hasMany(AlertaDemanda::class);
    }

    public function visitasComoComprador(): HasMany
    {
        return $this->hasMany(Visita::class, 'comprador_id');
    }

    public function visitasComoVendedor(): HasMany
    {
        return $this->hasMany(Visita::class, 'vendedor_id');
    }

    public function avaliacoesRecebidas(): HasMany
    {
        return $this->hasMany(Avaliacao::class, 'vendedor_id');
    }

    public function estaBloqueado(): bool
    {
        return $this->bloqueado_ate && $this->bloqueado_ate->isFuture();
    }
}
