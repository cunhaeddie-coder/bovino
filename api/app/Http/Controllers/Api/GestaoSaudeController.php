<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventoSaude;
use Illuminate\Http\Request;

class GestaoSaudeController extends Controller
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
            EventoSaude::where('fazenda_id', $fazenda->id)
                ->with(['animal:id,brinco,nome,raca', 'lote:id,nome'])
                ->when($request->tipo, fn($q) => $q->where('tipo', $request->tipo))
                ->when($request->vencendo, fn($q) => $q->whereNotNull('proxima_dose')
                    ->where('proxima_dose', '<=', now()->addDays(30)))
                ->orderBy('data_aplicacao', 'desc')
                ->paginate(30)
        );
    }

    public function store(Request $request)
    {
        $fazenda = $this->fazenda($request);

        $data = $request->validate([
            'animal_id'      => 'nullable|exists:rebanho,id',
            'lote_id'        => 'nullable|exists:lotes_gestao,id',
            'tipo'           => 'required|in:vacina,vermifugo,tratamento,exame,cirurgia,outro',
            'descricao'      => 'required|string|max:200',
            'produto'        => 'nullable|string|max:100',
            'dose_ml'        => 'nullable|numeric|min:0',
            'via_aplicacao'  => 'nullable|string|max:60',
            'data_aplicacao' => 'required|date',
            'proxima_dose'   => 'nullable|date|after:data_aplicacao',
            'veterinario'    => 'nullable|string|max:100',
            'custo'          => 'nullable|numeric|min:0',
            'observacao'     => 'nullable|string|max:500',
        ]);

        $data['fazenda_id'] = $fazenda->id;
        $evento = EventoSaude::create($data);

        return response()->json($evento, 201);
    }

    public function update(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        $evento = EventoSaude::where('fazenda_id', $fazenda->id)->findOrFail($id);

        $evento->update($request->validate([
            'descricao'    => 'sometimes|string|max:200',
            'proxima_dose' => 'nullable|date',
            'custo'        => 'nullable|numeric|min:0',
            'observacao'   => 'nullable|string|max:500',
        ]));

        return response()->json($evento->fresh());
    }

    public function destroy(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        EventoSaude::where('fazenda_id', $fazenda->id)->findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    public function alertas(Request $request)
    {
        $fazenda = $this->fazenda($request);

        $vencendo = EventoSaude::where('fazenda_id', $fazenda->id)
            ->whereNotNull('proxima_dose')
            ->where('proxima_dose', '<=', now()->addDays(30))
            ->with(['animal:id,brinco,nome', 'lote:id,nome'])
            ->orderBy('proxima_dose')
            ->get();

        return response()->json($vencendo);
    }
}
