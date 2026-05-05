<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class ReceitaFazenda extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['fazenda_id','descricao','categoria','valor','data','lote_id','observacoes','user_id'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function lote(): BelongsTo { return $this->belongsTo(LoteGestao::class, 'lote_id'); }
}
