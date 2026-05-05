<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Animal extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'animais';

    protected $fillable = [
        'user_id',
        'raca',
        'sexo',
        'idade_meses',
        'peso_estimado',
        'quantidade',
        'estado',
        'municipio',
        'propriedade',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'peso_estimado' => 'float',
            'quantidade' => 'integer',
            'idade_meses' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function anuncios(): HasMany
    {
        return $this->hasMany(Anuncio::class);
    }

    public function midias(): MorphMany
    {
        return $this->morphMany(Midia::class, 'anunciavel');
    }
}
