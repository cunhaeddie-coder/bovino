<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Fazenda extends Model
{
    protected $fillable = [
        'user_id', 'nome', 'slug', 'logo_url', 'fotos', 'descricao',
        'estado', 'municipio', 'area_ha', 'gta_numero', 'sisbov_numero',
        'website', 'whatsapp', 'anos_atividade', 'racas_principais', 'ativo',
    ];

    protected $casts = [
        'fotos'           => 'array',
        'racas_principais' => 'array',
        'ativo'           => 'boolean',
        'area_ha'         => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pastagens(): HasMany
    {
        return $this->hasMany(Pastagem::class);
    }

    public function rebanho(): HasMany
    {
        return $this->hasMany(Rebanho::class);
    }

    public function lotes(): HasMany
    {
        return $this->hasMany(LoteGestao::class);
    }

    public function avaliacoes(): HasMany
    {
        return $this->hasMany(Avaliacao::class, 'vendedor_id', 'user_id');
    }

    public function getNotaMediaAttribute(): float
    {
        return round($this->avaliacoes()->avg('nota') ?? 0, 1);
    }

    public function getTotalVendasAttribute(): int
    {
        return $this->avaliacoes()->where('negociacao_confirmada', true)->count();
    }
}
