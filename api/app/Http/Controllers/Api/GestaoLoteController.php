<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoteGestao;
use Illuminate\Http\Request;

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
        return response()->json(
            $fazenda->lotes()
                ->when($request->status, fn($q) => $q->where('status', $request->status))
                ->withCount('animais')
                ->latest()
                ->get()
        );
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
