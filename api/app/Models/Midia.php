<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Midia extends Model
{
    protected $table = 'midias';

    protected $fillable = [
        'tipo',
        'url',
        'thumbnail_url',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'ordem' => 'integer',
        ];
    }

    public function anunciavel(): MorphTo
    {
        return $this->morphTo();
    }
}
