<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToFazenda;

class Fornecedor extends Model
{
    use BelongsToFazenda;

    protected $table = 'fornecedores';
    protected $fillable = ['fazenda_id','nome','cnpj_cpf','telefone','email','categoria','contato_nome','estado','municipio','observacoes','ativo'];

    public function fazenda(): BelongsTo { return $this->belongsTo(Fazenda::class); }
    public function insumos(): HasMany { return $this->hasMany(Insumo::class, 'fornecedor_padrao_id'); }
    public function compras(): HasMany { return $this->hasMany(CompraInsumo::class); }
    public function contasPagar(): HasMany { return $this->hasMany(ContaPagar::class); }
}
