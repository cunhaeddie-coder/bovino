<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Custo;
use App\Models\Rebanho;
use App\Models\ReceitaFazenda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GestaoMovimentacoesController extends Controller
{
    private function fazenda(Request $request)
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');
        return $fazenda;
    }

    // Aquisições — custos de compra de animais
    public function aquisicoes(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $dados = Custo::where('fazenda_id', $fazenda->id)
            ->where('categoria', 'aquisicao')
            ->with(['lote:id,nome', 'animal:id,brinco,nome'])
            ->orderByDesc('data')
            ->paginate(30);

        $resumo = Custo::where('fazenda_id', $fazenda->id)
            ->where('categoria', 'aquisicao')
            ->selectRaw('COUNT(*) as total_registros, SUM(valor) as total_investido')
            ->first();

        return response()->json([
            'resumo' => $resumo,
            'dados'  => $dados,
        ]);
    }

    // Saídas — receitas de venda de animais
    public function saidas(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $dados = ReceitaFazenda::where('fazenda_id', $fazenda->id)
            ->whereIn('categoria', ['venda_animais', 'venda_gado', 'venda_leite'])
            ->with(['lote:id,nome'])
            ->orderByDesc('data')
            ->paginate(30);

        $resumo = ReceitaFazenda::where('fazenda_id', $fazenda->id)
            ->whereIn('categoria', ['venda_animais', 'venda_gado', 'venda_leite'])
            ->selectRaw('COUNT(*) as total_registros, SUM(valor) as total_recebido')
            ->first();

        return response()->json([
            'resumo' => $resumo,
            'dados'  => $dados,
        ]);
    }

    // Perdas e mortes — animais com status morto/descartado
    public function perdas(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $dados = Rebanho::where('fazenda_id', $fazenda->id)
            ->whereIn('status', ['morto', 'descartado'])
            ->orderByDesc('updated_at')
            ->paginate(30);

        $resumo = Rebanho::where('fazenda_id', $fazenda->id)
            ->whereIn('status', ['morto', 'descartado'])
            ->selectRaw('COUNT(*) as total, status')
            ->groupBy('status')
            ->get();

        return response()->json([
            'resumo' => $resumo,
            'dados'  => $dados,
        ]);
    }

    // Desempenho por origem — GMD médio agrupado por "procedencia" do animal
    public function porOrigem(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $dados = Rebanho::where('fazenda_id', $fazenda->id)
            ->where('status', 'ativo')
            ->whereNotNull('procedencia')
            ->where('procedencia', '!=', '')
            ->selectRaw('procedencia, COUNT(*) as total_animais, AVG(peso_atual) as peso_medio')
            ->groupBy('procedencia')
            ->get();

        return response()->json($dados);
    }
}
