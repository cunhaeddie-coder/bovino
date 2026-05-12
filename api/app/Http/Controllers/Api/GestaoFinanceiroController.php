<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Custo;
use App\Models\LoteGestao;
use App\Models\ReceitaFazenda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GestaoFinanceiroController extends Controller
{
    private function fazenda(Request $request)
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');
        return $fazenda;
    }

    public function index(Request $request)
    {
        $fazenda = $this->fazenda($request);

        return response()->json(
            Custo::where('fazenda_id', $fazenda->id)
                ->with(['lote:id,nome', 'animal:id,brinco,nome'])
                ->when($request->categoria, fn($q) => $q->where('categoria', $request->categoria))
                ->when($request->lote_id, fn($q) => $q->where('lote_id', $request->lote_id))
                ->when($request->mes, fn($q) => $q->whereYear('data', substr($request->mes, 0, 4))
                    ->whereMonth('data', substr($request->mes, 5, 2)))
                ->orderBy('data', 'desc')
                ->paginate(30)
        );
    }

    public function porLote(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $lotes = LoteGestao::where('fazenda_id', $fazenda->id)
            ->withSum('custos as total_custos', 'valor')
            ->withSum('receitasFazenda as total_receitas', 'valor')
            ->get()
            ->map(function ($lote) use ($fazenda) {
                $totalCustos   = (float) ($lote->total_custos   ?? 0);
                $totalReceitas = (float) ($lote->total_receitas ?? 0);

                // Custos por categoria para este lote
                $custosCat = Custo::where('lote_id', $lote->id)
                    ->select('categoria', DB::raw('SUM(valor) as total'))
                    ->groupBy('categoria')
                    ->pluck('total', 'categoria')
                    ->map(fn($v) => (float) $v);

                return [
                    'id'                    => $lote->id,
                    'nome'                  => $lote->nome,
                    'raca'                  => $lote->raca,
                    'categoria'             => $lote->categoria,
                    'qtd_cabecas'           => $lote->qtd_cabecas,
                    'total_custos'          => $totalCustos,
                    'total_receitas'        => $totalReceitas,
                    'resultado'             => round($totalReceitas - $totalCustos, 2),
                    'custo_por_cabeca'      => $lote->qtd_cabecas > 0
                        ? round($totalCustos / $lote->qtd_cabecas, 2)
                        : 0,
                    'custos_por_categoria'  => $custosCat,
                ];
            })
            ->sortByDesc('total_custos')
            ->values();

        return response()->json($lotes);
    }

    public function store(Request $request)
    {
        $fazenda = $this->fazenda($request);

        $data = $request->validate([
            'lote_id'     => 'nullable|exists:lotes_gestao,id',
            'animal_id'   => 'nullable|exists:rebanho,id',
            'categoria'   => 'required|in:aquisicao,alimentacao,saude,mao_de_obra,transporte,outros',
            'descricao'   => 'required|string|max:200',
            'valor'       => 'required|numeric|min:0',
            'data'        => 'required|date',
            'nota_fiscal' => 'nullable|string|max:60',
        ]);

        $data['fazenda_id'] = $fazenda->id;
        $custo = Custo::create($data);

        return response()->json($custo, 201);
    }

    public function destroy(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        Custo::where('fazenda_id', $fazenda->id)->findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    public function resumo(Request $request)
    {
        $fazenda = $this->fazenda($request);

        $ano = $request->get('ano', now()->year);

        $porMes = Custo::where('fazenda_id', $fazenda->id)
            ->whereYear('data', $ano)
            ->selectRaw('MONTH(data) as mes, categoria, SUM(valor) as total')
            ->groupBy('mes', 'categoria')
            ->get();

        $porCategoria = Custo::where('fazenda_id', $fazenda->id)
            ->whereYear('data', $ano)
            ->selectRaw('categoria, SUM(valor) as total')
            ->groupBy('categoria')
            ->pluck('total', 'categoria');

        return response()->json([
            'por_mes'       => $porMes,
            'por_categoria' => $porCategoria,
            'total_ano'     => $porCategoria->sum(),
        ]);
    }
}
