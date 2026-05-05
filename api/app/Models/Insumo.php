<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToFazenda;

class Insumo extends Model
{
    use BelongsToFazenda;

    protected $fillable = ['fazenda_id','nome','codigo','categoria','unidade','preco_unitario','fornecedor_padrao_id','descricao','ativo'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function fornecedor(): BelongsTo { return $this->belongsTo(Fornecedor::class, 'fornecedor_padrao_id'); }
    public function estoque(): HasOne { return $this->hasOne(EstoqueInsumo::class); }
    public function movimentacoes(): HasMany { return $this->hasMany(MovimentacaoEstoque::class); }
}
