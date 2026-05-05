<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class Pesagem extends Model
{
    use BelongsToFazenda;

    protected $fillable = [
        'fazenda_id', 'animal_id', 'lote_id',
        'peso', 'data_pesagem', 'gmd', 'observacao', 'coletado_em',
    ];

    protected $casts = [
        'peso'          => 'float',
        'gmd'           => 'float',
        'data_pesagem'  => 'date',
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
