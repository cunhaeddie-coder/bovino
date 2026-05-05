<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToFazenda;

class LoteGestao extends Model
{
    use BelongsToFazenda;

    protected $table = 'lotes_gestao';

    protected $fillable = [
        'fazenda_id', 'anuncio_id', 'nome', 'raca', 'categoria',
        'qtd_cabecas', 'peso_medio', 'preco_arroba', 'status', 'observacao',
    ];

    protected $casts = [
        'peso_medio'   => 'float',
        'preco_arroba' => 'float',
        'qtd_cabecas'  => 'integer',
    ];

    public function fazenda(): BelongsTo
    {
        return $this->belongsTo(Fazenda::class);
    }

    public function anuncio(): BelongsTo
    {
        return $this->belongsTo(Anuncio::class);
    }

    public function animais(): BelongsToMany
    {
        return $this->belongsToMany(Rebanho::class, 'rebanho_lote', 'lote_id', 'rebanho_id');
    }

    public function pesagens(): HasMany
    {
        return $this->hasMany(Pesagem::class, 'lote_id');
    }

    public function eventosSaude(): HasMany
    {
        return $this->hasMany(EventoSaude::class, 'lote_id');
    }

    public function custos(): HasMany
    {
        return $this->hasMany(Custo::class, 'lote_id');
    }

    public function getCustoTotalAttribute(): float
    {
        return $this->custos()->sum('valor');
    }
}
