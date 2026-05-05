<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class TrocaPiquete extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['fazenda_id','lote_id','pastagem_origem_id','pastagem_destino_id','data_troca','dias_descanso_origem','observacoes','user_id'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function lote(): BelongsTo { return $this->belongsTo(LoteGestao::class, 'lote_id'); }
    public function pastagOrigem(): BelongsTo { return $this->belongsTo(Pastagem::class, 'pastagem_origem_id'); }
    public function pastagDestino(): BelongsTo { return $this->belongsTo(Pastagem::class, 'pastagem_destino_id'); }
}
