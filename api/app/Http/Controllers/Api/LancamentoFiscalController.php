<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class LancamentoFiscalController extends Controller
{
    private const CATEGORIAS_RECEITA = [
        'venda_gado', 'venda_leite', 'arrendamento', 'outros_receita',
    ];

    private const CATEGORIAS_DESPESA = [
        'alimentacao', 'sanidade', 'funcionarios', 'combustivel',
        'manutencao', 'pastagem', 'impostos', 'outros_despesa',
    ];

    private function fazendaId(Request $request): int
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');
        return $fazenda->id;
    }

    public function index(Request $request): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);

        $query = DB::table('lancamentos_fiscais')
            ->where('fazenda_id', $fazendaId)
            ->orderByDesc('data')
            ->orderByDesc('id');

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->filled('categoria')) {
            $query->where('categoria', $request->categoria);
        }
        if ($request->filled('mes')) {
            $query->whereRaw("DATE_FORMAT(data, '%Y-%m') = ?", [$request->mes]);
        }

        return response()->json($query->paginate(30));
    }

    public function store(Request $request): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);

        $todasCategorias = array_merge(self::CATEGORIAS_RECEITA, self::CATEGORIAS_DESPESA);

        $data = $request->validate([
            'tipo'      => ['required', 'in:receita,despesa'],
            'categoria' => ['required', 'in:' . implode(',', $todasCategorias)],
            'valor'     => ['required', 'numeric', 'min:0.01'],
            'data'      => ['required', 'date'],
            'descricao' => ['nullable', 'string', 'max:500'],
            'vinculo_id'=> ['nullable', 'integer'],
        ]);

        $id = DB::table('lancamentos_fiscais')->insertGetId(array_merge($data, [
            'user_id'    => $request->user()->id,
            'fazenda_id' => $fazendaId,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return response()->json(DB::table('lancamentos_fiscais')->find($id), 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);

        $deleted = DB::table('lancamentos_fiscais')
            ->where('id', $id)
            ->where('fazenda_id', $fazendaId)
            ->delete();

        abort_if(!$deleted, 404);

        return response()->json(null, 204);
    }

    public function resumo(Request $request): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);
        $mes = $request->get('mes', now()->format('Y-m'));

        $totaisMes = DB::table('lancamentos_fiscais')
            ->where('fazenda_id', $fazendaId)
            ->whereRaw("DATE_FORMAT(data, '%Y-%m') = ?", [$mes])
            ->selectRaw("
                SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as receitas,
                SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as despesas
            ")
            ->first();

        $ultimos6Meses = DB::table('lancamentos_fiscais')
            ->where('fazenda_id', $fazendaId)
            ->where('data', '>=', now()->subMonths(5)->startOfMonth())
            ->selectRaw("
                DATE_FORMAT(data, '%Y-%m') as mes,
                SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as receitas,
                SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as despesas
            ")
            ->groupByRaw("DATE_FORMAT(data, '%Y-%m')")
            ->orderBy('mes')
            ->get();

        $categoriasDespesa = DB::table('lancamentos_fiscais')
            ->where('fazenda_id', $fazendaId)
            ->where('tipo', 'despesa')
            ->whereRaw("DATE_FORMAT(data, '%Y-%m') = ?", [$mes])
            ->selectRaw('categoria, SUM(valor) as total')
            ->groupBy('categoria')
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'receitas_mes'       => (float) ($totaisMes->receitas ?? 0),
            'despesas_mes'       => (float) ($totaisMes->despesas ?? 0),
            'saldo_mes'          => (float) (($totaisMes->receitas ?? 0) - ($totaisMes->despesas ?? 0)),
            'ultimos_6_meses'    => $ultimos6Meses,
            'categorias_despesa' => $categoriasDespesa,
        ]);
    }

    public function exportar(Request $request): Response
    {
        $fazendaId = $this->fazendaId($request);

        $query = DB::table('lancamentos_fiscais')
            ->where('fazenda_id', $fazendaId)
            ->orderByDesc('data');

        if ($request->filled('mes')) {
            $query->whereRaw("DATE_FORMAT(data, '%Y-%m') = ?", [$request->mes]);
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        $linhas = $query->get();

        $csv  = "\xEF\xBB\xBF"; // BOM UTF-8 para Excel
        $csv .= "Data;Tipo;Categoria;Descrição;Valor\n";

        foreach ($linhas as $l) {
            $tipo      = $l->tipo === 'receita' ? 'Receita' : 'Despesa';
            $categoria = $this->categoriaLabel($l->categoria);
            $descricao = str_replace([';', "\n"], [',', ' '], $l->descricao ?? '');
            $valor     = number_format($l->valor, 2, ',', '.');
            $csv      .= "{$l->data};{$tipo};{$categoria};{$descricao};{$valor}\n";
        }

        $periodo = $request->filled('mes') ? $request->mes : now()->format('Y');

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"lancamentos-fiscais-{$periodo}.csv\"",
        ]);
    }

    private function categoriaLabel(string $categoria): string
    {
        return match ($categoria) {
            'venda_gado'      => 'Venda de gado',
            'venda_leite'     => 'Venda de leite',
            'arrendamento'    => 'Arrendamento',
            'outros_receita'  => 'Outras receitas',
            'alimentacao'     => 'Ração / Alimentação',
            'sanidade'        => 'Vacinas / Sanidade',
            'funcionarios'    => 'Funcionários',
            'combustivel'     => 'Combustível',
            'manutencao'      => 'Manutenção',
            'pastagem'        => 'Pastagem / Terra',
            'impostos'        => 'Impostos / Taxas',
            'outros_despesa'  => 'Outras despesas',
            default           => $categoria,
        };
    }
}
