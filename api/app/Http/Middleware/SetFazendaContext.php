<?php

namespace App\Http\Middleware;

use App\Models\Fazenda;
use App\Services\FazendaContext;
use Closure;
use Illuminate\Http\Request;

class SetFazendaContext
{
    public function handle(Request $request, Closure $next): mixed
    {
        $user = $request->user();

        // Suporte multi-fazenda: cliente envia X-Fazenda-ID para selecionar a fazenda ativa
        $fazendaIdHeader = $request->header('X-Fazenda-ID');

        if ($fazendaIdHeader) {
            $fazenda = Fazenda::where('id', $fazendaIdHeader)
                ->where('user_id', $user->id)
                ->first();
        } else {
            $fazenda = $user->fazendas()->first();
        }

        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');

        FazendaContext::set($fazenda->id);

        return $next($request);
    }
}
