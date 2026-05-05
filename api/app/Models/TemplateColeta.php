<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToFazenda;

class TemplateColeta extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['fazenda_id','nome','descricao','campos','ativo'];
    protected $casts = ['campos' => 'array'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function registros(): HasMany { return $this->hasMany(RegistroColeta::class, 'template_id'); }
}
