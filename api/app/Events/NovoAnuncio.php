<?php

namespace App\Events;

use App\Models\Anuncio;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NovoAnuncio
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Anuncio $anuncio) {}
}
