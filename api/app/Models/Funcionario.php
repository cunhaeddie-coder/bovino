<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\MorphMany;
use App\Models\Concerns\BelongsToFazenda;

class Funcionario extends Model
{
    use BelongsToFazenda;

    protected $fillable = [
        'fazenda_id','user_id','nome','cpf','telefone','cargo','papel',
        'salario','data_admissao','data_demissao','tipo_contrato','observacoes','ativo',
    ];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function tarefas(): MorphMany { return $this->morphMany(Tarefa::class, 'responsavel'); }
}
