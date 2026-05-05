<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BuscaLog;
use App\Models\Transacao;
use App\Models\AlertaDemanda;
use Illuminate\Http\Request;

class AdminIntelligenciaController extends Controller
{
    public function resumo()
    {
        return response()->json([
            'total_buscas_hoje'     => BuscaLog::whereDate('created_at', today())->count(),
            'total_buscas_mes'      => BuscaLog::whereMonth('created_at', now()->month)->count(),
            'total_transacoes'      => Transacao::count(),
            'transacoes_confirmadas'=> Transacao::where('confirmada_comprador', true)->where('confirmada_vendedor', true)->count(),
            'alertas_ativos'        => AlertaDemanda::where('ativo', true)->count(),
            'top_racas'             => BuscaLog::whereNotNull('raca')
                ->where('created_at', '>=', now()->subDays(30))
                ->selectRaw('raca, COUNT(*) as buscas')
                ->groupBy('raca')->orderByDesc('buscas')->limit(10)->get(),
            'top_estados'           => BuscaLog::whereNotNull('estado')
                ->where('created_at', '>=', now()->subDays(30))
                ->selectRaw('estado, COUNT(*) as buscas')
                ->groupBy('estado')->orderByDesc('buscas')->limit(10)->get(),
        ]);
    }

    public function buscas(Request $request)
    {
        return response()->json(
            BuscaLog::with('user:id,nome')
                ->when($request->raca, fn($q) => $q->where('raca', $request->raca))
                ->when($request->estado, fn($q) => $q->where('estado', $request->estado))
                ->latest('created_at')
                ->paginate(30)
        );
    }

    public function transacoes(Request $request)
    {
        return response()->json(
            Transacao::with([
                'comprador:id,nome',
                'vendedor:id,nome',
                'anuncio:id,titulo',
            ])
            ->when($request->raca, fn($q) => $q->where('raca', $request->raca))
            ->when($request->estado, fn($q) => $q->where('estado', $request->estado))
            ->latest()
            ->paginate(25)
        );
    }

    public function alertas()
    {
        return response()->json(
            AlertaDemanda::with('user:id,nome,email')
                ->where('ativo', true)
                ->latest()
                ->paginate(30)
        );
    }
}
