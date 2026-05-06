<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrdemServico extends Model
{
    protected $table = 'ordens_servico';

    protected $fillable = [
        'fazenda_id', 'nome', 'finalidade', 'status',
        'criado_por', 'atribuido_a', 'pastagem_destino_id',
        'instrucoes', 'publicado_em', 'executado_em',
    ];

    protected function casts(): array
    {
        return [
            'publicado_em' => 'datetime',
            'executado_em' => 'datetime',
        ];
    }

    public function fazenda(): BelongsTo
    {
        return $this->belongsTo(Fazenda::class);
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }

    public function vaqueiro(): BelongsTo
    {
        return $this->belongsTo(Funcionario::class, 'atribuido_a');
    }

    public function pastagemDestino(): BelongsTo
    {
        return $this->belongsTo(Pastagem::class, 'pastagem_destino_id');
    }

    public function animais(): HasMany
    {
        return $this->hasMany(OrdemServicoAnimal::class);
    }

    public function progresso(): array
    {
        $total  = $this->animais()->count();
        $feitos = $this->animais()->where('status', 'feito')->count();
        return [
            'total'   => $total,
            'feitos'  => $feitos,
            'percent' => $total > 0 ? round($feitos / $total * 100) : 0,
        ];
    }
}
