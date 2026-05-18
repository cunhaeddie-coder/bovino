<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventoReproducao;
use App\Models\Rebanho;
use Illuminate\Http\Request;

class GestaoRebanhoController extends Controller
{
    private function fazenda(Request $request)
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');
        return $fazenda;
    }

    private function verificarLimite(Request $request, int $novasAdicionadas = 1): void
    {
        $assinatura = $request->user()->assinaturaAtiva();
        $maxCabecas = $assinatura?->plano?->max_cabecas;
        if ($maxCabecas === null) return;

        $atual = $request->user()->fazenda->rebanho()->count();
        if ($atual + $novasAdicionadas > $maxCabecas) {
            $planoAtual = $assinatura->plano->slug;
            abort(response()->json([
                'message'       => "Seu plano permite até {$maxCabecas} cabeças. Você possui {$atual}.",
                'upgrade'       => true,
                'max_cabecas'   => $maxCabecas,
                'cabecas_atuais'=> $atual,
                'plano_atual'   => $planoAtual,
            ], 403));
        }
    }

    public function index(Request $request)
    {
        $fazenda = $this->fazenda($request);
        $hoje = now();
        $animais = $fazenda->rebanho()
            ->with('pastagem:id,nome')
            ->when($request->categoria, fn($q) => $q->where('categoria', $request->categoria))
            ->when($request->sexo,      fn($q) => $q->where('sexo', $request->sexo))
            ->when($request->status,    fn($q) => $q->where('status', $request->status))
            ->when($request->raca,      fn($q) => $q->where('raca', 'like', '%'.$request->raca.'%'))
            ->when($request->brinco,    fn($q) => $q->where('brinco', 'like', '%'.$request->brinco.'%'))
            ->when($request->peso_min,  fn($q) => $q->where('peso_atual', '>=', $request->peso_min))
            ->when($request->peso_max,       fn($q) => $q->where('peso_atual', '<=', $request->peso_max))
            ->when($request->status_leiteiro, fn($q) => $q->where('status_leiteiro', $request->status_leiteiro))
            ->when($request->faixa_etaria, function ($q) use ($request, $hoje) {
                return match ($request->faixa_etaria) {
                    'ate_6m'    => $q->whereNotNull('data_nascimento')->whereDate('data_nascimento', '>=', $hoje->copy()->subMonths(6)),
                    '6_12m'     => $q->whereNotNull('data_nascimento')->whereDate('data_nascimento', '<', $hoje->copy()->subMonths(6))->whereDate('data_nascimento', '>=', $hoje->copy()->subMonths(12)),
                    '12_24m'    => $q->whereNotNull('data_nascimento')->whereDate('data_nascimento', '<', $hoje->copy()->subMonths(12))->whereDate('data_nascimento', '>=', $hoje->copy()->subMonths(24)),
                    'acima_24m' => $q->whereNotNull('data_nascimento')->whereDate('data_nascimento', '<', $hoje->copy()->subMonths(24)),
                    default     => $q,
                };
            })
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($animais);
    }

    public function store(Request $request)
    {
        $fazenda = $this->fazenda($request);

        $data = $request->validate([
            'brinco'          => 'nullable|string|max:30',
            'sisbov'          => 'nullable|string|max:60',
            'nome'            => 'nullable|string|max:60',
            'raca'            => 'required|string|max:60',
            'procedencia'     => 'nullable|string|max:120',
            'sexo'            => 'required|in:macho,femea',
            'categoria'        => 'required|in:bezerro,bezerra,novilho,novilha,touro,vaca,boi',
            'status_leiteiro'  => 'nullable|in:em_lactacao,seca',
            'data_nascimento'  => 'nullable|date',
            'peso_atual'       => 'nullable|numeric|min:0',
            'pastagem_id'      => 'nullable|exists:pastagens,id',
            'pai'              => 'nullable|string|max:60',
            'mae'              => 'nullable|string|max:60',
            'observacao'       => 'nullable|string|max:500',
        ]);

        // Limpa status_leiteiro se não for vaca
        if (($data['categoria'] ?? '') !== 'vaca') {
            $data['status_leiteiro'] = null;
        }

        $this->verificarLimite($request, 1);
        $data['fazenda_id'] = $fazenda->id;
        $animal = Rebanho::create($data);

        return response()->json($animal, 201);
    }

    public function storeGrupo(Request $request)
    {
        $fazenda = $this->fazenda($request);

        $data = $request->validate([
            'quantidade'      => 'required|integer|min:1|max:500',
        ]);
        $this->verificarLimite($request, (int) $request->quantidade);
        $data = $request->validate([
            'quantidade'      => 'required|integer|min:1|max:500',
            'raca'            => 'required|string|max:60',
            'sexo'            => 'required|in:macho,femea',
            'categoria'       => 'required|in:bezerro,bezerra,novilho,novilha,touro,vaca,boi',
            'peso_medio'      => 'nullable|numeric|min:0',
            'data_nascimento' => 'nullable|date',
            'prefixo_brinco'  => 'nullable|string|max:10',
            'brinco_inicial'  => 'nullable|integer|min:0',
            'observacao'      => 'nullable|string|max:500',
        ]);

        $criados = [];

        \DB::transaction(function () use ($data, $fazenda, &$criados) {
            for ($i = 0; $i < $data['quantidade']; $i++) {
                $brinco = null;
                if (!empty($data['prefixo_brinco'])) {
                    $num    = ($data['brinco_inicial'] ?? 1) + $i;
                    $brinco = $data['prefixo_brinco'] . str_pad($num, 3, '0', STR_PAD_LEFT);
                }

                $criados[] = Rebanho::create([
                    'fazenda_id'      => $fazenda->id,
                    'brinco'          => $brinco,
                    'raca'            => $data['raca'],
                    'sexo'            => $data['sexo'],
                    'categoria'       => $data['categoria'],
                    'peso_atual'      => $data['peso_medio'] ?? null,
                    'data_nascimento' => $data['data_nascimento'] ?? null,
                    'observacao'      => $data['observacao'] ?? null,
                    'status'          => 'ativo',
                ]);
            }
        });

        return response()->json([
            'message'   => "{$data['quantidade']} animais cadastrados com sucesso.",
            'total'     => count($criados),
            'categoria' => $data['categoria'],
        ], 201);
    }

    public function show(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        $animal = $fazenda->rebanho()
            ->with(['pastagem', 'pesagens', 'eventosSaude', 'eventosReproducao'])
            ->findOrFail($id);
        return response()->json($animal);
    }

    public function update(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        $animal = $fazenda->rebanho()->findOrFail($id);

        $data = $request->validate([
            'brinco'          => 'nullable|string|max:30',
            'sisbov'          => 'nullable|string|max:60',
            'nome'            => 'nullable|string|max:60',
            'raca'            => 'sometimes|string|max:60',
            'procedencia'     => 'nullable|string|max:120',
            'sexo'            => 'sometimes|in:macho,femea',
            'categoria'        => 'sometimes|in:bezerro,bezerra,novilho,novilha,touro,vaca,boi',
            'status_leiteiro'  => 'nullable|in:em_lactacao,seca',
            'data_nascimento'  => 'nullable|date',
            'peso_atual'       => 'nullable|numeric|min:0',
            'pastagem_id'      => 'nullable|exists:pastagens,id',
            'status'           => 'sometimes|in:ativo,vendido,morto,transferido',
            'pai'              => 'nullable|string|max:60',
            'mae'              => 'nullable|string|max:60',
            'observacao'       => 'nullable|string|max:500',
        ]);

        $categoria = $data['categoria'] ?? $animal->categoria;
        if ($categoria !== 'vaca') $data['status_leiteiro'] = null;

        $animal->update($data);
        return response()->json($animal->fresh());
    }

    public function destroy(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        $fazenda->rebanho()->findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    public function resumo(Request $request)
    {
        $fazenda = $this->fazenda($request);
        $q = $fazenda->rebanho()->where('status', 'ativo');

        return response()->json([
            'total'          => $q->count(),
            'machos'         => (clone $q)->where('sexo', 'macho')->count(),
            'femeas'         => (clone $q)->where('sexo', 'femea')->count(),
            'por_categoria'  => (clone $q)->selectRaw('categoria, count(*) as total')
                ->groupBy('categoria')->pluck('total', 'categoria'),
        ]);
    }

    public function inventario(Request $request)
    {
        $fazenda   = $this->fazenda($request);
        $dataRef   = $request->get('data', now()->toDateString());
        $fazendaNome = $fazenda->nome;

        // Animais ativos na data de referência:
        // - status ativo, OU
        // - vendido/morto/transferido depois da data de referência
        $q = $fazenda->rebanho()
            ->where(function ($query) use ($dataRef) {
                $query->where('status', 'ativo')
                      ->orWhere(function ($q2) use ($dataRef) {
                          $q2->whereIn('status', ['vendido', 'morto', 'transferido'])
                             ->whereDate('updated_at', '>', $dataRef);
                      });
            })
            ->whereDate('created_at', '<=', $dataRef);

        $categorias = (clone $q)
            ->selectRaw('
                categoria,
                COUNT(*) as total,
                SUM(CASE WHEN sexo = "macho" THEN 1 ELSE 0 END) as machos,
                SUM(CASE WHEN sexo = "femea" THEN 1 ELSE 0 END) as femeas,
                ROUND(AVG(CASE WHEN peso_atual > 0 THEN peso_atual END), 1) as peso_medio,
                ROUND(SUM(COALESCE(peso_atual, 0)), 0) as peso_total
            ')
            ->groupBy('categoria')
            ->orderByRaw("FIELD(categoria,'vaca','novilha','bezerra','touro','boi','novilho','bezerro')")
            ->get();

        $total      = (clone $q)->count();
        $pesoTotal  = (clone $q)->sum('peso_atual');
        $pesoMedio  = $total > 0 ? round($pesoTotal / $total, 1) : 0;

        return response()->json([
            'fazenda_nome'  => $fazendaNome,
            'data_ref'      => $dataRef,
            'gerado_em'     => now()->toDateTimeString(),
            'total_cabecas' => $total,
            'total_machos'  => (clone $q)->where('sexo', 'macho')->count(),
            'total_femeas'  => (clone $q)->where('sexo', 'femea')->count(),
            'peso_medio'    => $pesoMedio,
            'peso_total'    => round($pesoTotal, 0),
            'categorias'    => $categorias,
        ]);
    }

    public function dashboard(Request $request)
    {
        $fazenda = $this->fazenda($request);
        $hoje    = now();
        $base    = $fazenda->rebanho();
        $ativos  = fn() => (clone $base)->where('status', 'ativo');

        // ── KPIs principais ────────────────────────────────────────────────
        $total    = $ativos()->count();
        $machos   = $ativos()->where('sexo', 'macho')->count();
        $femeas   = $ativos()->where('sexo', 'femea')->count();
        $pesoMedio = $ativos()->whereNotNull('peso_atual')->avg('peso_atual');

        // ── Por categoria ──────────────────────────────────────────────────
        $porCategoria = $ativos()
            ->selectRaw('categoria, COUNT(*) as total, ROUND(AVG(peso_atual), 1) as peso_medio')
            ->groupBy('categoria')
            ->orderByRaw("FIELD(categoria, 'vaca','novilha','bezerra','touro','boi','novilho','bezerro')")
            ->get();

        // ── Por faixa etária ───────────────────────────────────────────────
        $porIdade = [
            'ate_6m'    => $ativos()->whereNotNull('data_nascimento')
                            ->whereDate('data_nascimento', '>=', $hoje->copy()->subMonths(6))->count(),
            '6_12m'     => $ativos()->whereNotNull('data_nascimento')
                            ->whereDate('data_nascimento', '<', $hoje->copy()->subMonths(6))
                            ->whereDate('data_nascimento', '>=', $hoje->copy()->subMonths(12))->count(),
            '12_24m'    => $ativos()->whereNotNull('data_nascimento')
                            ->whereDate('data_nascimento', '<', $hoje->copy()->subMonths(12))
                            ->whereDate('data_nascimento', '>=', $hoje->copy()->subMonths(24))->count(),
            'acima_24m' => $ativos()->whereNotNull('data_nascimento')
                            ->whereDate('data_nascimento', '<', $hoje->copy()->subMonths(24))->count(),
            'sem_data'  => $ativos()->whereNull('data_nascimento')->count(),
        ];

        // ── Nascimentos e mortes do mês ────────────────────────────────────
        $nascimentosMes = EventoReproducao::where('fazenda_id', $fazenda->id)
            ->where('tipo', 'parto')
            ->where('resultado', true)
            ->whereMonth('data_evento', $hoje->month)
            ->whereYear('data_evento', $hoje->year)
            ->count();

        $mortesMes = (clone $base)->where('status', 'morto')
            ->whereMonth('updated_at', $hoje->month)
            ->whereYear('updated_at', $hoje->year)
            ->count();

        // ── Prenhas (diagnóstico positivo nos últimos 90 dias) ─────────────
        $prenhas = EventoReproducao::where('fazenda_id', $fazenda->id)
            ->where('tipo', 'diagnostico_prenhez')
            ->where('resultado', true)
            ->whereDate('data_evento', '>=', $hoje->copy()->subDays(90))
            ->count();

        // ── Alerta: para desmama (bezerros/bezeras 6–8 meses) ─────────────
        $paraDesmama = $ativos()
            ->whereIn('categoria', ['bezerro', 'bezerra'])
            ->whereNotNull('data_nascimento')
            ->whereDate('data_nascimento', '<=', $hoje->copy()->subMonths(6))
            ->whereDate('data_nascimento', '>=', $hoje->copy()->subMonths(8))
            ->orderBy('data_nascimento')
            ->get(['id', 'brinco', 'nome', 'raca', 'sexo', 'categoria', 'data_nascimento', 'peso_atual', 'mae']);

        // ── Alerta: vaca sem cria (sem parto exitoso no último ano) ────────
        $vacasSemCria = $ativos()
            ->where('categoria', 'vaca')
            ->whereDoesntHave('eventosReproducao', function ($q) use ($hoje) {
                $q->where('tipo', 'parto')
                  ->where('resultado', true)
                  ->whereDate('data_evento', '>=', $hoje->copy()->subYear());
            })
            ->orderBy('data_nascimento')
            ->get(['id', 'brinco', 'nome', 'raca', 'data_nascimento', 'peso_atual']);

        // ── Alerta: natimortos recentes (últimos 30 dias) ──────────────────
        $natimortos = EventoReproducao::where('fazenda_id', $fazenda->id)
            ->where('tipo', 'parto')
            ->where('resultado', false)
            ->whereDate('data_evento', '>=', $hoje->copy()->subDays(30))
            ->with('animal:id,brinco,nome,raca')
            ->orderByDesc('data_evento')
            ->get(['id', 'animal_id', 'data_evento', 'peso_bezerro', 'sexo_bezerro', 'observacao']);

        // ── Alerta: baixo peso para categoria ─────────────────────────────
        // Benchmarks mínimos por categoria (kg)
        $benchmarks = [
            'bezerro'  => 80,
            'bezerra'  => 70,
            'novilho'  => 200,
            'novilha'  => 180,
            'boi'      => 350,
            'vaca'     => 280,
            'touro'    => 450,
        ];

        $baixoPeso = [];
        foreach ($benchmarks as $cat => $minPeso) {
            $animaisBaixoPeso = $ativos()
                ->where('categoria', $cat)
                ->whereNotNull('peso_atual')
                ->where('peso_atual', '<', $minPeso)
                ->get(['id', 'brinco', 'nome', 'raca', 'sexo', 'categoria', 'peso_atual', 'data_nascimento']);

            foreach ($animaisBaixoPeso as $a) {
                $a->benchmark = $minPeso;
                $baixoPeso[] = $a;
            }
        }

        return response()->json([
            'total'            => $total,
            'machos'           => $machos,
            'femeas'           => $femeas,
            'peso_medio'       => round($pesoMedio ?? 0, 1),
            'por_categoria'    => $porCategoria,
            'por_idade'        => $porIdade,
            'nascimentos_mes'  => $nascimentosMes,
            'mortes_mes'       => $mortesMes,
            'prenhas'          => $prenhas,
            'alertas' => [
                'desmama'       => $paraDesmama,
                'vaca_sem_cria' => $vacasSemCria,
                'natimortos'    => $natimortos,
                'baixo_peso'    => $baixoPeso,
            ],
        ]);
    }
}
