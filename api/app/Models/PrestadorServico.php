<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\MorphMany;
use App\Models\Concerns\BelongsToFazenda;

class PrestadorServico extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['fazenda_id','nome','cnpj_cpf','telefone','especialidade','valor_hora','valor_diaria','observacoes','ativo'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function tarefas(): MorphMany { return $this->morphMany(Tarefa::class, 'responsavel'); }
}
