<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BancoGenetico;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BancoGeneticoController extends Controller
{
    private function fazenda(Request $request)
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');
        return $fazenda;
    }

    public function index(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        return response()->json(
            BancoGenetico::where('fazenda_id', $fazenda->id)
                ->orderBy('touro_nome')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $data = $request->validate([
            'touro_nome'      => 'required|string|max:100',
            'raca'            => 'nullable|string|max:60',
            'rgd'             => 'nullable|string|max:60',
            'fabricante'      => 'nullable|string|max:100',
            'qtd_doses_total' => 'required|integer|min:0',
            'qtd_doses_atual' => 'required|integer|min:0',
            'partida'         => 'nullable|string|max:60',
            'observacao'      => 'nullable|string|max:500',
        ]);

        $data['fazenda_id'] = $fazenda->id;
        return response()->json(BancoGenetico::create($data), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $semen = BancoGenetico::where('fazenda_id', $fazenda->id)->findOrFail($id);

        $data = $request->validate([
            'touro_nome'      => 'sometimes|string|max:100',
            'raca'            => 'nullable|string|max:60',
            'rgd'             => 'nullable|string|max:60',
            'fabricante'      => 'nullable|string|max:100',
            'qtd_doses_total' => 'sometimes|integer|min:0',
            'qtd_doses_atual' => 'sometimes|integer|min:0',
            'partida'         => 'nullable|string|max:60',
            'observacao'      => 'nullable|string|max:500',
        ]);

        $semen->update($data);
        return response()->json($semen->fresh());
    }

    public function usarDose(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $semen = BancoGenetico::where('fazenda_id', $fazenda->id)->findOrFail($id);

        $qtd = (int) $request->get('qtd', 1);
        abort_if($semen->qtd_doses_atual < $qtd, 422, 'Doses insuficientes em estoque.');

        $semen->decrement('qtd_doses_atual', $qtd);
        return response()->json($semen->fresh());
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        BancoGenetico::where('fazenda_id', $fazenda->id)->findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
