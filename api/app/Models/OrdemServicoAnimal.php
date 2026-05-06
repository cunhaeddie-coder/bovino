<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrdemServicoAnimal extends Model
{
    protected $table = 'ordem_servico_animais';

    public $timestamps = false;

    protected $fillable = [
        'ordem_servico_id', 'animal_id', 'status',
        'pastagem_destino_id', 'peso_execucao',
        'observacao', 'executado_por', 'executado_em',
    ];

    protected function casts(): array
    {
        return [
            'executado_em' => 'datetime',
            'peso_execucao' => 'float',
        ];
    }

    public function ordemServico(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class);
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Rebanho::class, 'animal_id');
    }

    public function executor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executado_por');
    }

    public function pastagemDestino(): BelongsTo
    {
        return $this->belongsTo(Pastagem::class, 'pastagem_destino_id');
    }
}
