<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToFazenda;

class ConversaIA extends Model
{
    use BelongsToFazenda;

    protected $table = 'conversas_ia';
    protected $fillable = ['fazenda_id','user_id','mensagem','resposta','tipo','contexto'];
    protected $casts = ['contexto' => 'array'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
