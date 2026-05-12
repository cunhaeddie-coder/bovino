<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Anuncio extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'anuncios';

    protected $fillable = [
        'user_id',
        'animal_id',
        'titulo',
        'descricao',
        'preco_unitario',
        'aceita_negociacao',
        'destaque',
        'exibir_na_fazenda',
        'expira_em',
    ];

    protected function casts(): array
    {
        return [
            'preco_unitario'    => 'float',
            'aceita_negociacao' => 'boolean',
            'destaque'          => 'boolean',
            'exibir_na_fazenda' => 'boolean',
            'expira_em'         => 'datetime',
            'views'             => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function negociacoes(): HasMany
    {
        return $this->hasMany(Negociacao::class);
    }

    public function midias(): MorphMany
    {
        return $this->morphMany(Midia::class, 'anunciavel');
    }

    public function fotos(): MorphMany
    {
        return $this->morphMany(Midia::class, 'anunciavel')->where('tipo', 'foto')->orderBy('ordem');
    }

    public function estaAtivo(): bool
    {
        return !$this->trashed()
            && ($this->expira_em === null || $this->expira_em->isFuture())
            && $this->animal->status === 'disponivel';
    }
}
