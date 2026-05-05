<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use App\Models\Concerns\BelongsToFazenda;

class Tarefa extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['fazenda_id','titulo','descricao','tipo','prioridade','status','data_prevista','data_conclusao','responsavel_type','responsavel_id','lote_id','pastagem_id','criado_por'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function responsavel(): MorphTo { return $this->morphTo(); }
    public function lote(): BelongsTo { return $this->belongsTo(LoteGestao::class, 'lote_id'); }
    public function pastagem(): BelongsTo { return $this->belongsTo(Pastagem::class); }
    public function criador(): BelongsTo { return $this->belongsTo(User::class, 'criado_por'); }
}
