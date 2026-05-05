<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class AplicacaoNutricional extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['fazenda_id','descricao','tipo','insumo_id','quantidade_total','unidade','custo_total','data_aplicacao','lote_id','pastagem_id','observacoes','user_id'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function insumo(): BelongsTo { return $this->belongsTo(Insumo::class); }
    public function lote(): BelongsTo { return $this->belongsTo(LoteGestao::class, 'lote_id'); }
    public function pastagem(): BelongsTo { return $this->belongsTo(Pastagem::class); }
}
