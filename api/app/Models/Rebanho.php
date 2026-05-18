<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToFazenda;

class Rebanho extends Model
{
    use BelongsToFazenda;

    protected $table = 'rebanho';

    protected $fillable = [
        'fazenda_id', 'pastagem_id', 'brinco', 'sisbov', 'nome',
        'raca', 'procedencia', 'sexo', 'categoria', 'status_leiteiro', 'data_nascimento',
        'peso_atual', 'pai', 'mae', 'status', 'observacao',
    ];

    protected $casts = [
        'data_nascimento' => 'date',
        'peso_atual'      => 'float',
    ];

    public function fazenda(): BelongsTo
    {
        return $this->belongsTo(Fazenda::class);
    }

    public function pastagem(): BelongsTo
    {
        return $this->belongsTo(Pastagem::class);
    }

    public function lotes(): BelongsToMany
    {
        return $this->belongsToMany(LoteGestao::class, 'rebanho_lote', 'rebanho_id', 'lote_id');
    }

    public function pesagens(): HasMany
    {
        return $this->hasMany(Pesagem::class, 'animal_id');
    }

    public function eventosSaude(): HasMany
    {
        return $this->hasMany(EventoSaude::class, 'animal_id');
    }

    public function eventosReproducao(): HasMany
    {
        return $this->hasMany(EventoReproducao::class, 'animal_id');
    }

    public function getIdadeEmMesesAttribute(): ?int
    {
        if (!$this->data_nascimento) return null;
        return (int) $this->data_nascimento->diffInMonths(now());
    }
}
