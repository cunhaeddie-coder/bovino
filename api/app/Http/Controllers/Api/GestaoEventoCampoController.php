<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventoCampo;
use App\Models\Fazenda;
use App\Models\Rebanho;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GestaoEventoCampoController extends Controller
{
    private function fazenda(Request $request): Fazenda
    {
        return Fazenda::where('user_id', $request->user()->id)->firstOrFail();
    }

    public function index(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $eventos = EventoCampo::where('fazenda_id', $fazenda->id)
            ->with(['animal','lote','pastagem','reportador'])
            ->when($request->tipo,      fn($q) => $q->where('tipo', $request->tipo))
            ->when($request->resolvido !== null, fn($q) => $q->where('resolvido', $request->boolean('resolvido')))
            ->orderByDesc('data_evento')
            ->paginate(25);
        return response()->json($eventos);
    }

    public function store(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $data = $request->validate([
            'tipo'        => ['required','in:nascimento,morte,acidente,doença,fuga,cobertura,parto,cio,outros'],
            'descricao'   => ['required','string'],
            'animal_id'   => ['nullable','integer'],
            'lote_id'     => ['nullable','integer'],
            'pastagem_id' => ['nullable','integer'],
            'latitude'    => ['nullable','numeric'],
            'longitude'   => ['nullable','numeric'],
            'foto_url'    => ['nullable','string'],
            'urgencia'    => ['nullable','in:baixa,media,alta'],
            'data_evento' => ['nullable','date'],
        ]);

        $evento = EventoCampo::create([
            'fazenda_id'    => $fazenda->id,
            'reportado_por' => $request->user()->id,
            'data_evento'   => $data['data_evento'] ?? now(),
            'urgencia'      => $data['urgencia'] ?? 'media',
        ] + $data);

        return response()->json($evento->load(['animal','lote','pastagem']), 201);
    }

    public function resolver(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $evento  = EventoCampo::where('fazenda_id', $fazenda->id)->findOrFail($id);

        $evento->update([
            'resolvido' => true,
            'resolucao' => $request->input('resolucao'),
        ]);

        $animalCriado = null;

        if ($evento->tipo === 'nascimento' && $request->filled('brinco')) {
            $sexo      = $request->input('sexo', 'M');
            $categoria = $sexo === 'F' ? 'bezerra' : 'bezerro';

            $animalCriado = Rebanho::create([
                'fazenda_id'      => $fazenda->id,
                'brinco'          => $request->input('brinco'),
                'sexo'            => $sexo,
                'raca'            => $request->input('raca', 'Não informada'),
                'categoria'       => $categoria,
                'data_nascimento' => \Carbon\Carbon::parse($evento->data_evento)->toDateString(),
                'status'          => 'ativo',
            ]);

            $evento->update(['animal_id' => $animalCriado->id]);
        }

        return response()->json([
            'evento'        => $evento,
            'animal_criado' => $animalCriado,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        EventoCampo::where('fazenda_id', $fazenda->id)->findOrFail($id)->delete();
        return response()->json(['message' => 'Evento removido.']);
    }
}
