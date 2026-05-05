<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sugestao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GestaoSugestaoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sugestoes = Sugestao::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json($sugestoes);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'titulo'    => ['required', 'string', 'max:120'],
            'descricao' => ['required', 'string', 'max:2000'],
            'categoria' => ['required', 'in:funcionalidade,bug,usabilidade,desempenho,outro'],
        ]);

        $sugestao = Sugestao::create([
            ...$data,
            'user_id'    => $request->user()->id,
            'fazenda_id' => $request->user()->fazenda?->id,
        ]);

        return response()->json($sugestao, 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $sugestao = Sugestao::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'aberta')
            ->firstOrFail();

        $sugestao->delete();

        return response()->json(['message' => 'Sugestão removida.']);
    }
}
