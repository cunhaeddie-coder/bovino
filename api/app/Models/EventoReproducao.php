<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class EventoReproducao extends Model
{
    use BelongsToFazenda;

    protected $table = 'eventos_reproducao';

    protected $fillable = [
        'fazenda_id', 'animal_id', 'tipo', 'data_evento', 'resultado',
        'touro_brinco', 'semen_codigo', 'peso_bezerro',
        'sexo_bezerro', 'bezerro_id', 'observacao',
    ];

    protected $casts = [
        'data_evento'  => 'date',
        'resultado'    => 'boolean',
        'peso_bezerro' => 'float',
    ];

    public function fazenda(): BelongsTo
    {
        return $this->belongsTo(Fazenda::class);
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Rebanho::class, 'animal_id');
    }

    public function bezerro(): BelongsTo
    {
        return $this->belongsTo(Rebanho::class, 'bezerro_id');
    }

    // Verifica se já existe um parto registrado para este animal após a cobertura
    public function partoSubsequente()
    {
        return $this->hasMany(self::class, 'animal_id', 'animal_id')
            ->where('tipo', 'parto')
            ->whereColumn('data_evento', '>', 'eventos_reproducao.data_evento');
    }
}
