<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorKyc extends Model
{
    protected $table = 'vendor_kyc';

    protected $fillable = [
        'user_id', 'cpf_cnpj', 'tipo_documento',
        'inscricao_estadual', 'car_numero', 'estado_propriedade',
        'documento_frente_url', 'documento_verso_url', 'selfie_url',
        'kyc_status', 'status_receita', 'status_ie', 'status_ibama', 'status_selfie',
        'nome_receita', 'dados_receita', 'motivo_reprovacao',
        'aprovado_em', 'verificado_receita_em', 'verificado_ibama_em',
    ];

    protected $casts = [
        'dados_receita'         => 'array',
        'aprovado_em'           => 'datetime',
        'verificado_receita_em' => 'datetime',
        'verificado_ibama_em'   => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isAprovado(): bool
    {
        return $this->kyc_status === 'aprovado';
    }

    public function badges(): array
    {
        return [
            'receita' => $this->status_receita === 'ok',
            'ie'      => $this->status_ie === 'ok',
            'ibama'   => $this->status_ibama === 'ok',
            'selfie'  => $this->status_selfie === 'ok',
            'esg'     => $this->status_receita === 'ok' && $this->status_ie === 'ok' && $this->status_ibama === 'ok',
        ];
    }
}
