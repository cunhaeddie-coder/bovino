<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Sugestao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSugestaoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sugestoes = Sugestao::withoutGlobalScope('fazenda')
            ->with(['user:id,nome,email', 'fazenda:id,nome'])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->categoria, fn($q) => $q->where('categoria', $request->categoria))
            ->latest()
            ->paginate(20);

        return response()->json($sugestoes);
    }

    public function responder(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status'           => ['required', 'in:aberta,em_analise,aprovada,implementada,recusada'],
            'prioridade_admin' => ['nullable', 'in:baixa,media,alta,critica'],
            'resposta_admin'   => ['nullable', 'string', 'max:1000'],
        ]);

        $sugestao = Sugestao::withoutGlobalScope('fazenda')->findOrFail($id);
        $sugestao->update([
            ...$data,
            'respondida_em' => now(),
        ]);

        return response()->json($sugestao);
    }
}
