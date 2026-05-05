<?php

namespace App\Events;

use App\Models\Negociacao;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TransacaoConfirmada
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Negociacao $negociacao) {}
}
