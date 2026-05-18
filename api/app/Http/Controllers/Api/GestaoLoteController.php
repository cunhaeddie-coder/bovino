<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoteGestao;
use App\Models\Pesagem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GestaoLoteController extends Controller
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

        $lotes = $fazenda->lotes()
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->withCount(['animais' => fn($q) => $q->withoutGlobalScope('fazenda')])
            ->latest()
            ->get();

        // GMD por lote — usa withoutGlobalScope para evitar conflito com ONLY_FULL_GROUP_BY
        $loteIds = $lotes->pluck('id')->all();
        $gmds = collect();
        if (!empty($loteIds)) {
            $gmds = Pesagem::withoutGlobalScope('fazenda')
                ->whereIn('lote_id', $loteIds)
                ->where('fazenda_id', $fazenda->id)
                ->whereNotNull('gmd')
                ->select('lote_id', 'data_pesagem', DB::raw('AVG(gmd) as gmd_medio'))
                ->groupBy('lote_id', 'data_pesagem')
                ->orderBy('lote_id')
                ->orderByDesc('data_pesagem')
                ->get()
                ->groupBy('lote_id');
        }

        return response()->json(
            $lotes->map(fn($lote) => $this->comEvolucao($lote, $gmds->get($lote->id, collect())))
        );
    }

    private function comEvolucao($lote, $sessions): array
    {
        return [
            ...$lote->toArray(),
            'gmd_ultimo'    => $sessions->count() >= 1 ? round($sessions[0]->gmd_medio, 2) : null,
            'gmd_penultimo' => $sessions->count() >= 2 ? round($sessions[1]->gmd_medio, 2) : null,
            'gmd_total'     => $sessions->count() >= 1 ? round($sessions->avg('gmd_medio'), 2) : null,
        ];
    }

    public function store(Request $request)
    {
        $fazenda = $this->fazenda($request);

        $data = $request->validate([
            'nome'         => 'required|string|max:100',
            'raca'         => 'nullable|string|max:60',
            'categoria'    => 'required|in:bezerro,novilho,novilha,boi_gordo,vaca,touro,misto',
            'qtd_cabecas'  => 'required|integer|min:1',
            'peso_medio'   => 'nullable|numeric|min:0',
            'preco_arroba' => 'nullable|numeric|min:0',
            'status'       => 'sometimes|in:disponivel,reservado,vendido,interno',
            'observacao'   => 'nullable|string|max:500',
            'animais'      => 'nullable|array',
            'animais.*'    => 'exists:rebanho,id',
        ]);

        $animais = $data['animais'] ?? [];
        unset($data['animais']);

        $data['fazenda_id'] = $fazenda->id;
        $lote = LoteGestao::create($data);

        if ($animais) {
            $lote->animais()->sync($animais);
        }

        return response()->json($lote->load('animais'), 201);
    }

    public function show(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        $lote = $fazenda->lotes()
            ->with(['animais', 'pesagens', 'eventosSaude', 'custos'])
            ->findOrFail($id);

        return response()->json([
            ...$lote->toArray(),
            'custo_total' => $lote->custo_total,
        ]);
    }

    public function update(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        $lote = $fazenda->lotes()->findOrFail($id);

        $data = $request->validate([
            'nome'         => 'sometimes|string|max:100',
            'raca'         => 'nullable|string|max:60',
            'categoria'    => 'sometimes|in:bezerro,novilho,novilha,boi_gordo,vaca,touro,misto',
            'qtd_cabecas'  => 'sometimes|integer|min:1',
            'peso_medio'   => 'nullable|numeric|min:0',
            'preco_arroba' => 'nullable|numeric|min:0',
            'status'       => 'sometimes|in:disponivel,reservado,vendido,interno',
            'observacao'   => 'nullable|string|max:500',
        ]);

        $lote->update($data);
        return response()->json($lote->fresh());
    }

    public function destroy(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        $fazenda->lotes()->findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    public function projecao(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        $lote = $fazenda->lotes()
            ->withSum('custos as custo_total', 'valor')
            ->findOrFail($id);

        $precoArroba = (float) $request->get('preco_arroba', 0);
        $metaLucro   = (float) $request->get('meta_lucro', 30);
        $tipo        = $request->get('tipo', 'vivo');
        $rendimento  = (float) $request->get('rendimento', 52);

        // Peso: usa última pesagem média do lote, ou peso_medio cadastrado
        $ultimoPeso = Pesagem::where('lote_id', $lote->id)
            ->whereIn('id', Pesagem::select(DB::raw('MAX(id)'))->where('lote_id', $lote->id)->groupBy('animal_id'))
            ->avg('peso');

        $pesoMedioKg = $ultimoPeso ?? $lote->peso_medio ?? 0;
        $qtd         = $lote->qtd_cabecas;
        $custoTotal  = (float) ($lote->custo_total ?? 0);
        $pesoTotalKg = $pesoMedioKg * $qtd;

        $pesoEfetivo = $tipo === 'carcaca'
            ? $pesoTotalKg * ($rendimento / 100)
            : $pesoTotalKg;

        $arrobas         = $pesoEfetivo / 15;
        $receita         = $arrobas * $precoArroba;
        $resultado       = $receita - $custoTotal;
        $margem          = $receita > 0 ? round($resultado / $receita * 100, 1) : 0;
        $custoPorArroba  = $arrobas > 0 ? round($custoTotal / $arrobas, 2) : 0;
        $precoEquilibrio = $custoPorArroba;
        $precoMeta       = ($arrobas > 0 && $metaLucro < 100)
            ? round($custoTotal / ($arrobas * (1 - $metaLucro / 100)), 2)
            : null;

        return response()->json([
            'lote' => [
                'id'            => $lote->id,
                'nome'          => $lote->nome,
                'qtd_cabecas'   => $qtd,
                'peso_medio_kg' => round($pesoMedioKg, 1),
                'custo_total'   => round($custoTotal, 2),
                'fonte_peso'    => $ultimoPeso ? 'pesagem' : 'cadastro',
            ],
            'projecao' => [
                'preco_arroba'     => $precoArroba,
                'tipo'             => $tipo,
                'rendimento'       => $rendimento,
                'peso_total_kg'    => round($pesoTotalKg, 1),
                'arrobas_totais'   => round($arrobas, 1),
                'receita'          => round($receita, 2),
                'custo_total'      => round($custoTotal, 2),
                'resultado'        => round($resultado, 2),
                'margem_pct'       => $margem,
                'custo_por_arroba' => $custoPorArroba,
                'preco_equilibrio' => $precoEquilibrio,
                'preco_para_meta'  => $precoMeta,
                'meta_lucro_pct'   => $metaLucro,
                'positivo'         => $resultado >= 0,
            ],
        ]);
    }

    public function publicar(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        $lote = $fazenda->lotes()->findOrFail($id);

        // Retorna os dados pré-preenchidos para o formulário de anúncio
        return response()->json([
            'raca'        => $lote->raca,
            'categoria'   => $lote->categoria,
            'quantidade'  => $lote->qtd_cabecas,
            'peso_medio'  => $lote->peso_medio,
            'preco_total' => $lote->qtd_cabecas * ($lote->peso_medio / 30) * ($lote->preco_arroba ?? 0),
            'estado'      => $fazenda->estado,
            'municipio'   => $fazenda->municipio,
            'propriedade' => $fazenda->nome,
            'lote_id'     => $lote->id,
        ]);
    }
}
