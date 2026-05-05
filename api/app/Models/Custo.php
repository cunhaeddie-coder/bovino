<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class Custo extends Model
{
    use BelongsToFazenda;

    protected $table = 'custos';

    protected $fillable = [
        'fazenda_id', 'lote_id', 'animal_id',
        'categoria', 'descricao', 'valor', 'data', 'nota_fiscal',
    ];

    protected $casts = [
        'valor' => 'float',
        'data'  => 'date',
    ];

    public function fazenda(): BelongsTo
    {
        return $this->belongsTo(Fazenda::class);
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(LoteGestao::class, 'lote_id');
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Rebanho::class, 'animal_id');
    }
}
