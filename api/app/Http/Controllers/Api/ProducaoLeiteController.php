<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ProducaoLeiteController extends Controller
{
    private function fazendaId(Request $request): int
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');
        return $fazenda->id;
    }

    // ── Resumo do mês + últimos 30 dias para gráfico ──────────────────────────

    public function resumo(Request $request): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);
        $mes = $request->get('mes', now()->format('Y-m'));

        $totaisMes = DB::table('producao_leite')
            ->where('fazenda_id', $fazendaId)
            ->whereRaw("DATE_FORMAT(data, '%Y-%m') = ?", [$mes])
            ->selectRaw("
                COUNT(*) as dias_registrados,
                SUM(litros_manha + litros_tarde + litros_noite) as total_litros,
                ROUND(AVG(litros_manha + litros_tarde + litros_noite), 1) as media_dia,
                ROUND(AVG(preco_litro), 4) as preco_medio,
                SUM((litros_manha + litros_tarde + litros_noite) * preco_litro) as receita_mes
            ")
            ->first();

        $ultimos30 = DB::table('producao_leite')
            ->where('fazenda_id', $fazendaId)
            ->where('data', '>=', now()->subDays(29)->toDateString())
            ->selectRaw("data, litros_manha + litros_tarde + litros_noite as total, preco_litro")
            ->orderBy('data')
            ->get();

        $melhorDia = DB::table('producao_leite')
            ->where('fazenda_id', $fazendaId)
            ->whereRaw("DATE_FORMAT(data, '%Y-%m') = ?", [$mes])
            ->orderByRaw('litros_manha + litros_tarde + litros_noite DESC')
            ->selectRaw("data, litros_manha + litros_tarde + litros_noite as total")
            ->first();

        return response()->json([
            'mes'              => $mes,
            'dias_registrados' => (int)   ($totaisMes->dias_registrados ?? 0),
            'total_litros'     => (float) ($totaisMes->total_litros ?? 0),
            'media_dia'        => (float) ($totaisMes->media_dia ?? 0),
            'preco_medio'      => (float) ($totaisMes->preco_medio ?? 0),
            'receita_mes'      => (float) ($totaisMes->receita_mes ?? 0),
            'melhor_dia'       => $melhorDia,
            'ultimos_30_dias'  => $ultimos30,
        ]);
    }

    // ── Listagem do mês ───────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);
        $mes = $request->get('mes', now()->format('Y-m'));

        $registros = DB::table('producao_leite')
            ->where('fazenda_id', $fazendaId)
            ->whereRaw("DATE_FORMAT(data, '%Y-%m') = ?", [$mes])
            ->orderByDesc('data')
            ->get();

        return response()->json($registros);
    }

    // ── Upsert diário ─────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);

        $data = $request->validate([
            'data'          => ['required', 'date'],
            'litros_manha'  => ['required', 'numeric', 'min:0'],
            'litros_tarde'  => ['nullable', 'numeric', 'min:0'],
            'litros_noite'  => ['nullable', 'numeric', 'min:0'],
            'preco_litro'   => ['required', 'numeric', 'min:0'],
            'observacao'    => ['nullable', 'string', 'max:500'],
        ]);

        $registro = [
            'fazenda_id'   => $fazendaId,
            'user_id'      => $request->user()->id,
            'data'         => $data['data'],
            'litros_manha' => $data['litros_manha'],
            'litros_tarde' => $data['litros_tarde'] ?? 0,
            'litros_noite' => $data['litros_noite'] ?? 0,
            'preco_litro'  => $data['preco_litro'],
            'observacao'   => $data['observacao'] ?? null,
            'updated_at'   => now(),
        ];

        // Upsert — se já existe lançamento para essa data, atualiza
        $existente = DB::table('producao_leite')
            ->where('fazenda_id', $fazendaId)
            ->where('data', $data['data'])
            ->first();

        if ($existente) {
            DB::table('producao_leite')
                ->where('id', $existente->id)
                ->update($registro);
            $id = $existente->id;
        } else {
            $registro['created_at'] = now();
            $id = DB::table('producao_leite')->insertGetId($registro);
        }

        return response()->json(DB::table('producao_leite')->find($id), 201);
    }

    // ── Excluir ───────────────────────────────────────────────────────────────

    public function destroy(Request $request, int $id): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);
        DB::table('producao_leite')
            ->where('id', $id)
            ->where('fazenda_id', $fazendaId)
            ->delete();
        return response()->json(null, 204);
    }

    // ── Exportar CSV para contador ────────────────────────────────────────────

    public function exportar(Request $request): Response
    {
        $fazendaId = $this->fazendaId($request);

        $query = DB::table('producao_leite')
            ->where('fazenda_id', $fazendaId)
            ->orderBy('data');

        if ($request->filled('mes')) {
            $query->whereRaw("DATE_FORMAT(data, '%Y-%m') = ?", [$request->mes]);
        }

        $registros = $query->get();
        $periodo   = $request->filled('mes') ? $request->mes : now()->format('Y');

        $csv  = "\xEF\xBB\xBF";
        $csv .= "Data;Manhã (L);Tarde (L);Noite (L);Total (L);Preço/L;Receita;Observação\n";

        foreach ($registros as $r) {
            $total   = $r->litros_manha + $r->litros_tarde + $r->litros_noite;
            $receita = number_format($total * $r->preco_litro, 2, ',', '.');
            $total   = number_format($total, 2, ',', '.');
            $preco   = number_format($r->preco_litro, 4, ',', '.');
            $obs     = str_replace([';', "\n"], [',', ' '], $r->observacao ?? '');
            $csv    .= "{$r->data};{$r->litros_manha};{$r->litros_tarde};{$r->litros_noite};{$total};{$preco};{$receita};{$obs}\n";
        }

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"producao-leite-{$periodo}.csv\"",
        ]);
    }

    // ── Último preço cadastrado (para preencher o form) ───────────────────────

    public function ultimoPreco(Request $request): JsonResponse
    {
        $fazendaId = $this->fazendaId($request);

        $ultimo = DB::table('producao_leite')
            ->where('fazenda_id', $fazendaId)
            ->orderByDesc('data')
            ->value('preco_litro');

        return response()->json(['preco_litro' => $ultimo ? (float) $ultimo : null]);
    }
}
