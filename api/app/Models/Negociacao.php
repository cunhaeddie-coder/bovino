<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Negociacao extends Model
{
    use HasFactory;

    protected $table = 'negociacoes';

    protected $fillable = [
        'anuncio_id',
        'comprador_id',
        'vendedor_id',
        'status',
        'preco_proposto',
        'mensagem_inicial',
        'preco_contra_proposta',
        'contra_proposta_de',
        'cotacao_arroba_momento',
    ];

    protected function casts(): array
    {
        return [
            'preco_proposto'        => 'float',
            'preco_contra_proposta' => 'float',
            'cotacao_arroba_momento'=> 'float',
        ];
    }

    public function anuncio(): BelongsTo
    {
        return $this->belongsTo(Anuncio::class);
    }

    public function comprador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'comprador_id');
    }

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    public function mensagens(): HasMany
    {
        return $this->hasMany(Mensagem::class)->orderBy('created_at');
    }

    public function avaliacao(): HasOne
    {
        return $this->hasOne(Avaliacao::class);
    }
}
