<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cotacao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class CotacaoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tipo = $request->get('tipo', 'boi_gordo');
        $estado = $request->get('estado');

        $query = Cotacao::where('tipo', $tipo)
            ->orderByDesc('referencia_em')
            ->limit(30);

        if ($estado) {
            $query->where('estado', $estado);
        }

        return response()->json($query->get());
    }

    public function b3(): JsonResponse
    {
        $dados = Cache::remember('cotacao_b3_bgi', 900, function () {
            try {
                $resp = Http::timeout(10)
                    ->withHeaders(['Accept' => 'application/json'])
                    ->get('https://cotacao.b3.com.br/mds/api/v1/derivativeQuotation/BGI');

                if (!$resp->ok()) return null;

                $contratos = collect($resp->json('Scty') ?? [])
                    ->filter(fn($s) => ($s['mkt']['cd'] ?? '') === 'FUT')
                    ->filter(fn($s) => ($s['SctyQtn']['prvsDayAdjstmntPric'] ?? 0) > 0)
                    ->sortByDesc(fn($s) => $s['asset']['AsstSummry']['opnCtrcts'] ?? 0)
                    ->values();

                if ($contratos->isEmpty()) return null;

                $c   = $contratos->first();
                $qtn = $c['SctyQtn'];

                $ajuste  = (float) ($qtn['prvsDayAdjstmntPric'] ?? 0);
                $curPrc  = (float) ($qtn['curPrc'] ?? 0);
                $bid     = (float) ($c['buyOffer']['price']  ?? 0);
                $ask     = (float) ($c['sellOffer']['price'] ?? 0);

                // Preço: atual > médio bid/ask > ajuste anterior
                $preco = $curPrc > 0 ? $curPrc
                    : ($bid > 0 && $ask > 0 ? round(($bid + $ask) / 2, 2) : $ajuste);

                $pregaoAberto = $curPrc > 0 || ($bid > 0 && $ask > 0);
                $variacao     = $preco > 0 && $ajuste > 0 ? round($preco - $ajuste, 2) : 0;
                $variacaoPct  = $ajuste > 0 && $variacao != 0 ? round(($variacao / $ajuste) * 100, 2) : 0;

                $venc = $c['asset']['AsstSummry']['mtrtyCode'] ?? null;

                return [
                    'contrato'      => $c['symb'] ?? 'BGI',
                    'vencimento'    => $venc,
                    'preco'         => round($preco, 2),
                    'ajuste'        => round($ajuste, 2),
                    'minimo'        => round($qtn['bottomLmtPric'] ?? 0, 2),
                    'maximo'        => round($qtn['topLmtPric'] ?? 0, 2),
                    'bid'           => round($bid, 2),
                    'ask'           => round($ask, 2),
                    'contratos_abertos' => (int) ($c['asset']['AsstSummry']['opnCtrcts'] ?? 0),
                    'variacao'      => $variacao,
                    'variacao_pct'  => $variacaoPct,
                    'pregao_aberto' => $pregaoAberto,
                    'fonte'         => 'B3',
                    'atualizado'    => now()->toISOString(),
                ];
            } catch (\Exception $e) {
                return null;
            }
        });

        if (!$dados) {
            return response()->json(['error' => 'Dados B3 indisponíveis'], 503);
        }

        return response()->json($dados);
    }

    public function b3Historico(Request $request): JsonResponse
    {
        $periodo = $request->get('periodo', '1m');

        $dias = match($periodo) {
            '1s' => 7,
            '3m' => 90,
            '1a' => 365,
            default => 30, // 1m
        };

        $dados = Cotacao::where('tipo', 'boi_gordo')
            ->where('fonte', 'B3')
            ->whereDate('referencia_em', '>=', now()->subDays($dias))
            ->orderBy('referencia_em')
            ->get(['referencia_em', 'preco_arroba']);

        return response()->json($dados);
    }

    public function ultima(): JsonResponse
    {
        $cotacoes = [];

        foreach (['boi_gordo', 'bezerro', 'vaca'] as $tipo) {
            $cotacoes[$tipo] = Cotacao::where('tipo', $tipo)
                ->orderByDesc('referencia_em')
                ->first();
        }

        return response()->json($cotacoes);
    }
}
