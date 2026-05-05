<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class ContaReceber extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['fazenda_id','descricao','cliente_nome','cliente_telefone','valor','vencimento','status','recebido_em','observacoes','user_id'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
}
