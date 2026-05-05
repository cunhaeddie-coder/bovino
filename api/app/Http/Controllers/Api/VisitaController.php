<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anuncio;
use App\Models\Visita;
use Illuminate\Http\Request;

class VisitaController extends Controller
{
    public function minhas(Request $request)
    {
        $user = $request->user();

        $visitas = Visita::where(function ($q) use ($user) {
            $q->where('comprador_id', $user->id)
              ->orWhere('vendedor_id', $user->id);
        })
        ->with(['anuncio:id,titulo,raca', 'comprador:id,nome', 'vendedor:id,nome'])
        ->when($request->status, fn($q) => $q->where('status', $request->status))
        ->orderBy('data_solicitada', 'desc')
        ->paginate(20);

        return response()->json($visitas);
    }

    public function solicitar(Request $request, int $anuncioId)
    {
        $anuncio = Anuncio::findOrFail($anuncioId);
        abort_if($anuncio->user_id === $request->user()->id, 422, 'Você não pode solicitar visita ao próprio anúncio.');

        $data = $request->validate([
            'data_solicitada' => 'required|date|after:today',
            'hora_solicitada' => 'nullable|date_format:H:i',
            'mensagem'        => 'nullable|string|max:500',
        ]);

        $visita = Visita::create([
            ...$data,
            'anuncio_id'  => $anuncioId,
            'comprador_id' => $request->user()->id,
            'vendedor_id'  => $anuncio->user_id,
            'status'       => 'pendente',
        ]);

        return response()->json($visita->load(['anuncio:id,titulo', 'vendedor:id,nome']), 201);
    }

    public function responder(Request $request, int $id)
    {
        $visita = Visita::where('vendedor_id', $request->user()->id)->findOrFail($id);
        abort_if(!in_array($visita->status, ['pendente']), 422, 'Esta visita não pode ser respondida.');

        $data = $request->validate([
            'status'          => 'required|in:confirmada,recusada',
            'resposta'        => 'nullable|string|max:500',
            'data_confirmada' => 'required_if:status,confirmada|nullable|date',
            'hora_confirmada' => 'nullable|date_format:H:i',
        ]);

        $visita->update($data);
        return response()->json($visita->fresh());
    }

    public function cancelar(Request $request, int $id)
    {
        $user = $request->user();
        $visita = Visita::where(function ($q) use ($user) {
            $q->where('comprador_id', $user->id)->orWhere('vendedor_id', $user->id);
        })->findOrFail($id);

        abort_if(!in_array($visita->status, ['pendente', 'confirmada']), 422, 'Esta visita não pode ser cancelada.');

        $visita->update(['status' => 'cancelada']);
        return response()->json($visita->fresh());
    }
}
