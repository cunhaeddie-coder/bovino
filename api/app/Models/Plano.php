<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plano extends Model
{
    protected $fillable = [
        'slug', 'nome', 'tipo', 'preco', 'periodo', 'recursos',
        'max_anuncios', 'max_destaques', 'ver_contato_vendedor',
        'alertas_preco', 'analytics', 'badge_verificado',
        'suporte_prioritario', 'ativo', 'ordem',
    ];

    protected function casts(): array
    {
        return [
            'recursos' => 'array',
            'preco' => 'float',
            'ver_contato_vendedor' => 'boolean',
            'alertas_preco' => 'boolean',
            'analytics' => 'boolean',
            'badge_verificado' => 'boolean',
            'suporte_prioritario' => 'boolean',
            'ativo' => 'boolean',
        ];
    }

    public function assinaturas(): HasMany
    {
        return $this->hasMany(Assinatura::class);
    }
}
