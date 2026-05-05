<?php

namespace App\Providers;

use App\Events\NovoAnuncio;
use App\Events\NovaNegociacao;
use App\Events\TransacaoConfirmada;
use App\Listeners\MatchingAlertasDemanda;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Event::listen(NovoAnuncio::class,        MatchingAlertasDemanda::class);
        // Listeners futuros podem ser adicionados aqui:
        // Event::listen(NovaNegociacao::class,    NotificarVendedor::class);
        // Event::listen(TransacaoConfirmada::class, GerarComissao::class);
    }
}
