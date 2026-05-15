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

                $contratos = $resp->json('Scty') ?? [];
                if (empty($contratos)) return null;

                // Pega o contrato com maior volume (mais líquido)
                usort($contratos, fn($a, $b) =>
                    ($b['SctyQtn']['finQty'] ?? 0) <=> ($a['SctyQtn']['finQty'] ?? 0)
                );

                $c = $contratos[0];
                $qtn = $c['SctyQtn'];

                $precoAtual   = (float) ($qtn['curPrc'] ?? 0);
                $precoFechAnt = (float) ($qtn['prvsDayClsgPrc'] ?? 0);
                $pregaoAberto = $precoAtual > 0;

                // Fora do pregão: usa fechamento anterior como preço de referência
                $preco = $pregaoAberto ? $precoAtual : $precoFechAnt;
                $variacao    = $pregaoAberto ? (float) ($qtn['prcFlcn'] ?? 0) : 0;
                $variacaoPct = $pregaoAberto ? (float) ($qtn['prcFlcnPct'] ?? 0) : 0;

                return [
                    'contrato'      => $c['FinInstrmId']['MktIdrCd'] ?? 'BGI',
                    'vencimento'    => $c['FinInstrmId']['Exptn']['XprtnDt'] ?? null,
                    'preco'         => round($preco, 2),
                    'abertura'      => round($qtn['opnPrc'] ?? 0, 2),
                    'minimo'        => round($qtn['minPrc'] ?? 0, 2),
                    'maximo'        => round($qtn['maxPrc'] ?? 0, 2),
                    'fechamento'    => round($precoFechAnt, 2),
                    'variacao'      => round($variacao, 2),
                    'variacao_pct'  => round($variacaoPct, 2),
                    'negocios'      => (int) ($qtn['finQty'] ?? 0),
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
