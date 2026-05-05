<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

    public function index(Request $request)
    {
        $fazenda = $this->fazenda($request);
        $animais = $fazenda->rebanho()
            ->with('pastagem:id,nome')
            ->when($request->categoria, fn($q) => $q->where('categoria', $request->categoria))
            ->when($request->sexo, fn($q) => $q->where('sexo', $request->sexo))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->raca, fn($q) => $q->where('raca', $request->raca))
            ->orderBy('created_at', 'desc')
            ->paginate(30);

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
            'sexo'            => 'required|in:macho,femea',
            'categoria'       => 'required|in:bezerro,bezerra,novilho,novilha,touro,vaca,boi',
            'data_nascimento' => 'nullable|date',
            'peso_atual'      => 'nullable|numeric|min:0',
            'pastagem_id'     => 'nullable|exists:pastagens,id',
            'pai'             => 'nullable|string|max:60',
            'mae'             => 'nullable|string|max:60',
            'observacao'      => 'nullable|string|max:500',
        ]);

        $data['fazenda_id'] = $fazenda->id;
        $animal = Rebanho::create($data);

        return response()->json($animal, 201);
    }

    public function show(Request $request, int $id)
    {
        $fazenda = $this->fazenda($request);
        $animal = $fazenda->rebanho()->with(['pastagem', 'pesagens', 'eventosSaude', 'eventosReproducao'])->findOrFail($id);
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
            'sexo'            => 'sometimes|in:macho,femea',
            'categoria'       => 'sometimes|in:bezerro,bezerra,novilho,novilha,touro,vaca,boi',
            'data_nascimento' => 'nullable|date',
            'peso_atual'      => 'nullable|numeric|min:0',
            'pastagem_id'     => 'nullable|exists:pastagens,id',
            'status'          => 'sometimes|in:ativo,vendido,morto,transferido',
            'observacao'      => 'nullable|string|max:500',
        ]);

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
            'total'     => $q->count(),
            'machos'    => (clone $q)->where('sexo', 'macho')->count(),
            'femeas'    => (clone $q)->where('sexo', 'femea')->count(),
            'por_categoria' => (clone $q)->selectRaw('categoria, count(*) as total')
                ->groupBy('categoria')->pluck('total', 'categoria'),
        ]);
    }
}
