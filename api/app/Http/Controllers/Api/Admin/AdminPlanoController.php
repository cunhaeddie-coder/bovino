<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plano;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPlanoController extends Controller
{
    public function index(): JsonResponse
    {
        $planos = Plano::withCount('assinaturas')
            ->orderBy('tipo')
            ->orderBy('ordem')
            ->get();

        return response()->json($planos);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $plano = Plano::findOrFail($id);

        $data = $request->validate([
            'nome'                 => 'sometimes|string|max:120',
            'preco'                => 'sometimes|numeric|min:0',
            'preco_anual'          => 'nullable|numeric|min:0',
            'max_cabecas'          => 'nullable|integer|min:0',
            'max_anuncios'         => 'sometimes|integer|min:0',
            'max_destaques'        => 'sometimes|integer|min:0',
            'recursos'             => 'sometimes|array',
            'suporte_prioritario'  => 'sometimes|boolean',
            'ativo'                => 'sometimes|boolean',
        ]);

        $plano->update($data);

        return response()->json($plano->fresh());
    }

    public function toggleAtivo(int $id): JsonResponse
    {
        $plano = Plano::findOrFail($id);
        $plano->update(['ativo' => !$plano->ativo]);

        return response()->json(['ativo' => $plano->ativo]);
    }
}
