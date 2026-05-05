<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToFazenda;

class Pastagem extends Model
{
    use BelongsToFazenda;

    protected $fillable = [
        'fazenda_id', 'nome', 'area_ha', 'capacidade_ua',
        'tipo_capim', 'status', 'observacao',
    ];

    public function fazenda(): BelongsTo
    {
        return $this->belongsTo(Fazenda::class);
    }

    public function animais(): HasMany
    {
        return $this->hasMany(Animal::class);
    }
}
