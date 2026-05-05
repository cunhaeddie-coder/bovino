<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustoSaas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminCustoSaasController extends Controller
{
    private const CATEGORIAS  = ['hosting', 'apis', 'ferramentas', 'marketing', 'pessoal', 'juridico', 'outro'];
    private const RECORRENCIAS = ['mensal', 'anual', 'unico'];

    public function index(Request $request): JsonResponse
    {
        $query = CustoSaas::query();

        if ($request->filled('categoria')) {
            $query->where('categoria', $request->categoria);
        }
        if ($request->has('ativo')) {
            $query->where('ativo', filter_var($request->ativo, FILTER_VALIDATE_BOOLEAN));
        }

        $custos = $query->orderBy('categoria')->orderBy('descricao')->paginate(50);

        return response()->json($custos);
    }

    public function resumo(): JsonResponse
    {
        $ativos = CustoSaas::where('ativo', true)->get();

        $totalMensal  = $ativos->sum('valor_mensal');
        $totalAnual   = $ativos->where('recorrencia', 'anual')->sum('valor');
        $totalUnico   = CustoSaas::where('recorrencia', 'unico')->sum('valor');

        $porCategoria = $ativos->groupBy('categoria')->map(function ($group) {
            return [
                'total_mensal' => round($group->sum('valor_mensal'), 2),
                'count'        => $group->count(),
            ];
        });

        // Próximos vencimentos (30 dias)
        $vencimentos = CustoSaas::where('ativo', true)
            ->whereNotNull('data_vencimento')
            ->whereBetween('data_vencimento', [now(), now()->addDays(30)])
            ->orderBy('data_vencimento')
            ->get(['id', 'descricao', 'categoria', 'valor', 'recorrencia', 'data_vencimento']);

        return response()->json([
            'mrca'           => round($totalMensal, 2),   // Monthly Recurring Cost
            'total_anual'    => round($totalAnual, 2),
            'total_unico'    => round($totalUnico, 2),
            'por_categoria'  => $porCategoria,
            'vencimentos'    => $vencimentos,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'descricao'       => ['required', 'string', 'max:200'],
            'categoria'       => ['required', Rule::in(self::CATEGORIAS)],
            'valor'           => ['required', 'numeric', 'min:0'],
            'recorrencia'     => ['required', Rule::in(self::RECORRENCIAS)],
            'data_vencimento' => ['nullable', 'date'],
            'observacao'      => ['nullable', 'string', 'max:500'],
            'ativo'           => ['boolean'],
        ]);

        $custo = CustoSaas::create($data);

        return response()->json($custo, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $custo = CustoSaas::findOrFail($id);

        $data = $request->validate([
            'descricao'       => ['sometimes', 'string', 'max:200'],
            'categoria'       => ['sometimes', Rule::in(self::CATEGORIAS)],
            'valor'           => ['sometimes', 'numeric', 'min:0'],
            'recorrencia'     => ['sometimes', Rule::in(self::RECORRENCIAS)],
            'data_vencimento' => ['nullable', 'date'],
            'observacao'      => ['nullable', 'string', 'max:500'],
            'ativo'           => ['boolean'],
        ]);

        $custo->update($data);

        return response()->json($custo->fresh());
    }

    public function destroy(int $id): JsonResponse
    {
        CustoSaas::findOrFail($id)->delete();

        return response()->json(['message' => 'Custo removido.']);
    }
}
