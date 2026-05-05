<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gestao\StorePesagemRequest;
use App\Models\Pesagem;
use App\Models\Rebanho;
use Illuminate\Http\Request;

class GestaoPesagemController extends Controller
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
            Pesagem::where('fazenda_id', $fazenda->id)
                ->with(['animal:id,brinco,nome,raca', 'lote:id,nome'])
                ->when($request->animal_id, fn($q) => $q->where('animal_id', $request->animal_id))
                ->when($request->lote_id, fn($q) => $q->where('lote_id', $request->lote_id))
                ->orderBy('data_pesagem', 'desc')
                ->paginate(30)
        );
    }

    public function store(StorePesagemRequest $request)
    {
        $fazenda = $this->fazenda($request);
        $data    = $request->validated();

        // Calcula GMD se o animal tiver pesagem anterior
        if (!empty($data['animal_id'])) {
            $anterior = Pesagem::where('animal_id', $data['animal_id'])
                ->where('data_pesagem', '<', $data['data_pesagem'])
                ->orderByDesc('data_pesagem')
                ->first();

            if ($anterior) {
                $dias = $anterior->data_pesagem->diffInDays($data['data_pesagem']);
                $data['gmd'] = $dias > 0 ? round(($data['peso'] - $anterior->peso) / $dias, 3) : null;
            }

            // Atualiza peso atual do animal
            Rebanho::where('id', $data['animal_id'])->update(['peso_atual' => $data['peso']]);
        }

        $data['fazenda_id'] = $fazenda->id;
        $pesagem = Pesagem::create($data);

        return response()->json($pesagem, 201);
    }

    public function destroy(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        Pesagem::where('fazenda_id', $fazenda->id)->findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    public function evolucao(Request $request, int $animalId)
    {
        $fazenda = $this->fazenda($request);

        $pesagens = Pesagem::where('fazenda_id', $fazenda->id)
            ->where('animal_id', $animalId)
            ->orderBy('data_pesagem')
            ->get(['data_pesagem', 'peso', 'gmd']);

        return response()->json($pesagens);
    }
}
