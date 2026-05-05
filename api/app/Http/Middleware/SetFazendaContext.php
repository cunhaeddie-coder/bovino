<?php

namespace App\Http\Middleware;

use App\Services\FazendaContext;
use Closure;
use Illuminate\Http\Request;

class SetFazendaContext
{
    public function handle(Request $request, Closure $next): mixed
    {
        $fazenda = $request->user()?->fazenda;

        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');

        FazendaContext::set($fazenda->id);

        return $next($request);
    }
}
