<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pagamento extends Model
{
    protected $table = 'pagamentos';

    protected $fillable = [
        'assinatura_id', 'valor', 'status',
        'gateway_id', 'metodo', 'gateway_response', 'pago_em',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'float',
            'gateway_response' => 'array',
            'pago_em' => 'datetime',
        ];
    }

    public function assinatura(): BelongsTo
    {
        return $this->belongsTo(Assinatura::class);
    }
}
