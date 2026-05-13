<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimentacaoEstoque extends Model
{
    protected $table = 'movimentacoes_estoque';
    public $timestamps = false;
    protected $fillable = ['insumo_id','fazenda_id','tipo','quantidade','custo_unitario','motivo','compra_id','user_id','created_at'];

    protected $casts = ['created_at' => 'datetime'];

    public function insumo(): BelongsTo { return $this->belongsTo(Insumo::class); }
    public function compra(): BelongsTo { return $this->belongsTo(CompraInsumo::class, 'compra_id'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
