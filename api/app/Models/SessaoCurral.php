<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class SessaoCurral extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['fazenda_id','user_id','data_sessao','descricao','status','dados_offline','total_animais','sincronizado_em'];
    protected $casts = ['dados_offline' => 'array', 'sincronizado_em' => 'datetime'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
