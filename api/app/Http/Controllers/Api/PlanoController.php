<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plano;
use Illuminate\Http\JsonResponse;

class PlanoController extends Controller
{
    public function index(): JsonResponse
    {
        $planos = Plano::where('ativo', true)
            ->orderBy('tipo')
            ->orderBy('ordem')
            ->get()
            ->groupBy('tipo');

        return response()->json($planos);
    }

    public function show(string $slug): JsonResponse
    {
        $plano = Plano::where('slug', $slug)->where('ativo', true)->firstOrFail();
        return response()->json($plano);
    }
}
