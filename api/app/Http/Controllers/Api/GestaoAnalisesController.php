<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cotacao;
use App\Models\LoteGestao;
use App\Models\Pesagem;
use App\Models\Rebanho;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class GestaoAnalisesController extends Controller
{
    private function fazenda(Request $request)
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');
        return $fazenda;
    }

    // ── Minha @ vs Mercado ──────────────────────────────────────────────────────
    public function minhaArroba(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        // Preços de mercado
        $b3    = Cache::get('cotacao_b3_bgi');
        $b3Preco = $b3 ? (float) $b3['preco'] : null;

        $cepeaPreco = Cotacao::where('tipo', 'boi_gordo')
            ->whereNotNull('estado')
            ->where('fonte', '!=', 'B3')
            ->orderByDesc('referencia_em')
            ->value('preco_arroba');

        // Lotes com preço definido
        $lotes = LoteGestao::where('fazenda_id', $fazenda->id)
            ->whereNotNull('preco_arroba')
            ->where('preco_arroba', '>', 0)
            ->get(['id', 'nome', 'categoria', 'raca', 'qtd_cabecas', 'peso_medio', 'preco_arroba', 'status'])
            ->map(fn($l) => [
                'id'           => $l->id,
                'nome'         => $l->nome,
                'categoria'    => $l->categoria,
                'raca'         => $l->raca,
                'status'       => $l->status,
                'preco_arroba' => round($l->preco_arroba, 2),
                'vs_b3'        => $b3Preco    ? round($l->preco_arroba - $b3Preco,    2) : null,
                'vs_b3_pct'    => $b3Preco    ? round(($l->preco_arroba - $b3Preco)    / $b3Preco    * 100, 1) : null,
                'vs_cepea'     => $cepeaPreco ? round($l->preco_arroba - $cepeaPreco, 2) : null,
                'vs_cepea_pct' => $cepeaPreco ? round(($l->preco_arroba - $cepeaPreco) / $cepeaPreco * 100, 1) : null,
            ])
            ->sortByDesc('preco_arroba')
            ->values();

        return response()->json([
            'mercado' => ['b3' => $b3Preco, 'cepea' => $cepeaPreco ? round($cepeaPreco, 2) : null],
            'lotes'   => $lotes,
        ]);
    }

    // ── Raças em Números ─────────────────────────────────────────────────────────
    public function racas(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $fid     = $fazenda->id;

        // Animais ativos por raça
        $rebanho = Rebanho::where('fazenda_id', $fid)
            ->where('status', 'ativo')
            ->whereNotNull('raca')
            ->where('raca', '!=', '')
            ->select('raca', DB::raw('COUNT(*) as total'), DB::raw('AVG(peso_atual) as peso_medio'))
            ->groupBy('raca')
            ->get();

        if ($rebanho->isEmpty()) {
            return response()->json([]);
        }

        // GMD médio por raça (via pesagens → join rebanho)
        $gmds = Pesagem::where('pesagens.fazenda_id', $fid)
            ->whereNotNull('pesagens.gmd')
            ->join('rebanho', 'pesagens.animal_id', '=', 'rebanho.id')
            ->whereNotNull('rebanho.raca')
            ->where('rebanho.raca', '!=', '')
            ->select('rebanho.raca', DB::raw('AVG(pesagens.gmd) as gmd_medio'))
            ->groupBy('rebanho.raca')
            ->pluck('gmd_medio', 'raca');

        // Lotes por raça (preço médio/@)
        $lotesRaca = LoteGestao::where('fazenda_id', $fid)
            ->whereNotNull('raca')
            ->where('raca', '!=', '')
            ->whereNotNull('preco_arroba')
            ->select('raca', DB::raw('COUNT(*) as lotes'), DB::raw('AVG(preco_arroba) as preco_medio'))
            ->groupBy('raca')
            ->get()
            ->keyBy('raca');

        $result = $rebanho->map(fn($r) => [
            'raca'          => $r->raca,
            'total_animais' => (int) $r->total,
            'peso_medio_kg' => $r->peso_medio ? round((float) $r->peso_medio, 1) : null,
            'gmd_medio'     => $gmds->has($r->raca) ? round((float) $gmds[$r->raca], 2) : null,
            'preco_arroba'  => $lotesRaca->has($r->raca) ? round((float) $lotesRaca[$r->raca]->preco_medio, 2) : null,
            'lotes'         => $lotesRaca->has($r->raca) ? (int) $lotesRaca[$r->raca]->lotes : 0,
        ])->sortByDesc('total_animais')->values();

        return response()->json($result);
    }
}
