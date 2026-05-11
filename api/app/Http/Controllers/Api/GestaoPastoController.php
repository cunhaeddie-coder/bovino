<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AplicacaoNutricional;
use App\Models\Fazenda;
use App\Models\RegistroColeta;
use App\Models\TemplateColeta;
use App\Models\TrocaPiquete;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GestaoPastoController extends Controller
{
    private function fazenda(Request $request): Fazenda
    {
        return Fazenda::where('user_id', $request->user()->id)->firstOrFail();
    }

    // ── MAPA DE PASTAGENS ────────────────────────────────────────────────────

    public function mapaPastagens(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $pastagens = \App\Models\Pastagem::where('fazenda_id', $fazenda->id)
            ->withCount('lotes')
            ->get()
            ->map(fn($p) => [
                'id'          => $p->id,
                'nome'        => $p->nome,
                'area_ha'     => $p->area_ha,
                'tipo'        => $p->tipo_capim,
                'capacidade'  => $p->capacidade_ua,
                'status'      => $p->status,
                'lotes_count' => $p->lotes_count,
                'ocupada'     => $p->lotes_count > 0,
                'posicao_x'   => null,
                'posicao_y'   => null,
            ]);

        return response()->json($pastagens);
    }

    public function storePastagem(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $request->validate([
            'nome'       => ['required', 'string', 'max:100'],
            'area_ha'    => ['nullable', 'numeric', 'min:0'],
            'tipo'       => ['nullable', 'string', 'max:50'],
            'capacidade' => ['nullable', 'numeric', 'min:0'],
        ]);
        $pastagem = \App\Models\Pastagem::create([
            'fazenda_id'   => $fazenda->id,
            'nome'         => $request->nome,
            'area_ha'      => $request->area_ha,
            'tipo_capim'   => $request->tipo,
            'capacidade_ua'=> $request->capacidade,
        ]);
        return response()->json([
            'id'         => $pastagem->id,
            'nome'       => $pastagem->nome,
            'area_ha'    => $pastagem->area_ha,
            'tipo'       => $pastagem->tipo_capim,
            'capacidade' => $pastagem->capacidade_ua,
            'status'     => $pastagem->status,
            'ocupada'    => false,
            'lotes_count'=> 0,
        ], 201);
    }

    public function updatePastagem(Request $request, int $id): JsonResponse
    {
        $fazenda  = $this->fazenda($request);
        $pastagem = \App\Models\Pastagem::where('fazenda_id', $fazenda->id)->findOrFail($id);
        $request->validate([
            'nome'       => ['sometimes', 'string', 'max:100'],
            'area_ha'    => ['nullable', 'numeric', 'min:0'],
            'tipo'       => ['nullable', 'string', 'max:50'],
            'capacidade' => ['nullable', 'numeric', 'min:0'],
        ]);
        $pastagem->update([
            'nome'          => $request->nome          ?? $pastagem->nome,
            'area_ha'       => $request->area_ha,
            'tipo_capim'    => $request->tipo,
            'capacidade_ua' => $request->capacidade,
        ]);
        return response()->json([
            'id'         => $pastagem->id,
            'nome'       => $pastagem->nome,
            'area_ha'    => $pastagem->area_ha,
            'tipo'       => $pastagem->tipo_capim,
            'capacidade' => $pastagem->capacidade_ua,
            'status'     => $pastagem->status,
        ]);
    }

    public function destroyPastagem(Request $request, int $id): JsonResponse
    {
        $fazenda  = $this->fazenda($request);
        $pastagem = \App\Models\Pastagem::where('fazenda_id', $fazenda->id)->findOrFail($id);
        $pastagem->delete();
        return response()->json(['message' => 'Pastagem removida.']);
    }

    // ── TROCAS DE PIQUETE ────────────────────────────────────────────────────

    public function indexTrocas(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        return response()->json(
            TrocaPiquete::where('fazenda_id', $fazenda->id)
                ->with(['lote','pastagOrigem','pastagDestino'])
                ->orderByDesc('data_troca')->paginate(20)
        );
    }

    public function storeTroca(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'lote_id'               => ['required','integer'],
            'pastagem_origem_id'    => ['nullable','integer'],
            'pastagem_destino_id'   => ['required','integer'],
            'data_troca'            => ['required','date'],
            'dias_descanso_origem'  => ['nullable','integer'],
            'observacoes'           => ['nullable','string'],
        ]);

        $troca = TrocaPiquete::create([
            'fazenda_id' => $fazenda->id,
            'user_id'    => $request->user()->id,
        ] + $data);

        // Atualiza pastagem_id no lote
        \App\Models\LoteGestao::where('id', $data['lote_id'])
            ->where('fazenda_id', $fazenda->id)
            ->update(['pastagem_id' => $data['pastagem_destino_id']]);

        return response()->json($troca->load(['lote','pastagDestino']), 201);
    }

    // ── APLICAÇÕES NUTRICIONAIS ──────────────────────────────────────────────

    public function indexAplicacoes(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        return response()->json(
            AplicacaoNutricional::where('fazenda_id', $fazenda->id)
                ->with(['insumo','lote','pastagem'])
                ->orderByDesc('data_aplicacao')->paginate(20)
        );
    }

    public function storeAplicacao(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'descricao'       => ['required','string'],
            'tipo'            => ['required','in:suplemento,mineral,racao,sal,outro'],
            'insumo_id'       => ['nullable','integer'],
            'quantidade_total'=> ['required','numeric','min:0.001'],
            'unidade'         => ['required','string'],
            'custo_total'     => ['nullable','numeric'],
            'data_aplicacao'  => ['required','date'],
            'lote_id'         => ['nullable','integer'],
            'pastagem_id'     => ['nullable','integer'],
            'observacoes'     => ['nullable','string'],
        ]);

        $ap = AplicacaoNutricional::create([
            'fazenda_id' => $fazenda->id,
            'user_id'    => $request->user()->id,
        ] + $data);

        // Baixa no estoque se tiver insumo vinculado
        if (!empty($data['insumo_id'])) {
            $estoque = \App\Models\EstoqueInsumo::where('insumo_id', $data['insumo_id'])->first();
            if ($estoque) $estoque->decrement('quantidade_atual', $data['quantidade_total']);
        }

        return response()->json($ap->load(['insumo','lote']), 201);
    }

    // ── COLETAS PERSONALIZADAS ───────────────────────────────────────────────

    public function indexTemplates(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        return response()->json(
            TemplateColeta::where('fazenda_id', $fazenda->id)->where('ativo', true)->get()
        );
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'nome'      => ['required','string'],
            'descricao' => ['nullable','string'],
            'campos'    => ['required','array','min:1'],
            'campos.*.nome'    => ['required','string'],
            'campos.*.tipo'    => ['required','in:numero,texto,opcao,escala,booleano'],
            'campos.*.opcoes'  => ['nullable','array'],
            'campos.*.obrigatorio' => ['boolean'],
        ]);
        $t = TemplateColeta::create(['fazenda_id' => $fazenda->id] + $data);
        return response()->json($t, 201);
    }

    public function indexRegistros(Request $request, int $templateId): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $template = TemplateColeta::where('fazenda_id', $fazenda->id)->findOrFail($templateId);
        return response()->json(
            RegistroColeta::where('template_id', $template->id)
                ->with(['animal','lote','pastagem','user'])
                ->orderByDesc('data_coleta')->paginate(25)
        );
    }

    public function storeRegistro(Request $request, int $templateId): JsonResponse
    {
        $fazenda  = $this->fazenda($request);
        $template = TemplateColeta::where('fazenda_id', $fazenda->id)->findOrFail($templateId);

        $registro = RegistroColeta::create([
            'template_id' => $template->id,
            'fazenda_id'  => $fazenda->id,
            'dados'       => $request->input('dados', []),
            'animal_id'   => $request->input('animal_id'),
            'lote_id'     => $request->input('lote_id'),
            'pastagem_id' => $request->input('pastagem_id'),
            'user_id'     => $request->user()->id,
            'data_coleta' => $request->input('data_coleta', today()),
        ]);

        return response()->json($registro, 201);
    }
}
