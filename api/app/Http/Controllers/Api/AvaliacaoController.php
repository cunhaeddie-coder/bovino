<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Avaliacao;
use App\Models\Negociacao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvaliacaoController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'negociacao_id' => 'required|exists:negociacoes,id',
            'nota'          => 'required|integer|min:1|max:5',
            'comentario'    => 'nullable|string|max:1000',
        ]);

        $negociacao = Negociacao::findOrFail($data['negociacao_id']);

        if ($negociacao->comprador_id !== $request->user()->id) {
            return response()->json(['message' => 'Apenas o comprador pode avaliar.'], 403);
        }

        if ($negociacao->status !== 'concluida') {
            return response()->json(['message' => 'A negociação precisa estar concluída para avaliar.'], 422);
        }

        if (Avaliacao::where('negociacao_id', $negociacao->id)->exists()) {
            return response()->json(['message' => 'Esta negociação já foi avaliada.'], 422);
        }

        $avaliacao = Avaliacao::create([
            'negociacao_id'          => $negociacao->id,
            'anuncio_id'             => $negociacao->anuncio_id,
            'vendedor_id'            => $negociacao->vendedor_id,
            'comprador_id'           => $negociacao->comprador_id,
            'nota'                   => $data['nota'],
            'comentario'             => $data['comentario'] ?? null,
            'negociacao_confirmada'  => true,
        ]);

        return response()->json($avaliacao->load('comprador:id,nome'), 201);
    }

    public function responder(Request $request, int $id): JsonResponse
    {
        $avaliacao = Avaliacao::findOrFail($id);

        if ($avaliacao->vendedor_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $data = $request->validate([
            'resposta_vendedor' => 'required|string|max:1000',
        ]);

        $avaliacao->update(['resposta_vendedor' => $data['resposta_vendedor']]);

        return response()->json($avaliacao);
    }

    public function recebidas(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $avaliacoes = Avaliacao::where('vendedor_id', $userId)
            ->with('comprador:id,nome')
            ->latest()
            ->get();

        return response()->json($avaliacoes);
    }

    public function negociacoesPendentes(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        // Negociações concluídas do comprador que ainda não foram avaliadas
        $negociacoes = Negociacao::where('comprador_id', $userId)
            ->where('status', 'concluida')
            ->whereDoesntHave('avaliacao')
            ->with('anuncio:id,titulo', 'vendedor:id,nome')
            ->get(['id', 'anuncio_id', 'vendedor_id', 'created_at']);

        return response()->json($negociacoes);
    }
}
