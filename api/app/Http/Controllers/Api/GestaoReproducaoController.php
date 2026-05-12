<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventoReproducao;
use App\Models\Fazenda;
use App\Models\Rebanho;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GestaoReproducaoController extends Controller
{
    private function fazenda(Request $request): Fazenda
    {
        return Fazenda::where('user_id', $request->user()->id)->firstOrFail();
    }

    public function dashboard(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $totalFemeas = Rebanho::where('fazenda_id', $fazenda->id)
            ->where('sexo', 'femea')
            ->count();

        // Prenhas: cobertura/iatf/diagnostico_prenhez com resultado true nos últimos 300 dias
        $prenhas = EventoReproducao::where('fazenda_id', $fazenda->id)
            ->whereIn('tipo', ['cobertura', 'iatf', 'diagnostico_prenhez'])
            ->where('resultado', true)
            ->where('data_evento', '>=', now()->subDays(300))
            ->whereDoesntHave('partoSubsequente')
            ->count();

        // Partos esperados: coberturas confirmadas cujo data_evento + 283 dias cai nos próximos 60 dias
        $partosEsperados = EventoReproducao::where('fazenda_id', $fazenda->id)
            ->whereIn('tipo', ['cobertura', 'iatf'])
            ->where('resultado', true)
            ->whereBetween(
                \DB::raw('DATE_ADD(data_evento, INTERVAL 283 DAY)'),
                [now(), now()->addDays(60)]
            )
            ->count();

        $recentEvents = EventoReproducao::where('fazenda_id', $fazenda->id)
            ->with('animal:id,brinco,nome,raca')
            ->orderByDesc('data_evento')
            ->limit(5)
            ->get();

        return response()->json([
            'total_femeas'      => $totalFemeas,
            'prenhas'           => $prenhas,
            'partos_esperados'  => $partosEsperados,
            'eventos_recentes'  => $recentEvents,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $query = EventoReproducao::where('fazenda_id', $fazenda->id)
            ->with('animal:id,brinco,nome,raca,categoria')
            ->orderByDesc('data_evento');

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->filled('periodo')) {
            $query->where('data_evento', '>=', now()->subDays((int) $request->periodo));
        }

        return response()->json($query->paginate(30));
    }

    public function store(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);

        $data = $request->validate([
            'animal_id'    => ['required', 'integer', 'exists:rebanho,id'],
            'tipo'         => ['required', 'in:cobertura,iatf,diagnostico_prenhez,parto,desmame,descarte'],
            'data_evento'  => ['required', 'date'],
            'resultado'    => ['nullable', 'boolean'],
            'touro_brinco' => ['nullable', 'string', 'max:50'],
            'semen_codigo' => ['nullable', 'string', 'max:50'],
            'peso_bezerro' => ['nullable', 'numeric', 'min:0'],
            'sexo_bezerro' => ['nullable', 'in:macho,femea'],
            'observacao'   => ['nullable', 'string'],
        ]);

        $evento = EventoReproducao::create([
            'fazenda_id' => $fazenda->id,
        ] + $data);

        return response()->json($evento->load('animal:id,brinco,nome,raca'), 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        EventoReproducao::where('fazenda_id', $fazenda->id)->findOrFail($id)->delete();
        return response()->json(['message' => 'Evento removido.']);
    }

    public function proximosPartos(Request $request): JsonResponse
    {
        $fazenda = $this->fazenda($request);
        $dias    = (int) ($request->query('dias', 60));

        $eventos = EventoReproducao::where('fazenda_id', $fazenda->id)
            ->whereIn('tipo', ['cobertura', 'iatf'])
            ->where('resultado', true)
            ->whereBetween(
                \DB::raw('DATE_ADD(data_evento, INTERVAL 283 DAY)'),
                [now(), now()->addDays($dias)]
            )
            ->with('animal:id,brinco,nome,raca')
            ->orderBy(\DB::raw('DATE_ADD(data_evento, INTERVAL 283 DAY)'))
            ->get()
            ->map(fn($e) => [
                'id'              => $e->id,
                'animal'          => $e->animal,
                'data_cobertura'  => $e->data_evento->format('Y-m-d'),
                'parto_esperado'  => $e->data_evento->addDays(283)->format('Y-m-d'),
                'dias_restantes'  => (int) now()->diffInDays($e->data_evento->addDays(283), false),
                'touro_brinco'    => $e->touro_brinco,
            ]);

        return response()->json($eventos);
    }
}
