<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class EventoSaude extends Model
{
    use BelongsToFazenda;

    protected $table = 'eventos_saude';

    protected $fillable = [
        'fazenda_id', 'animal_id', 'lote_id', 'tipo', 'descricao',
        'produto', 'dose_ml', 'via_aplicacao', 'data_aplicacao',
        'proxima_dose', 'veterinario', 'custo', 'observacao',
    ];

    protected $casts = [
        'data_aplicacao' => 'date',
        'proxima_dose'   => 'date',
        'custo'          => 'float',
        'dose_ml'        => 'float',
    ];

    public function fazenda(): BelongsTo
    {
        return $this->belongsTo(Fazenda::class);
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Rebanho::class, 'animal_id');
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(LoteGestao::class, 'lote_id');
    }
}
