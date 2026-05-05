<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cotacao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CotacaoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tipo = $request->get('tipo', 'boi_gordo');
        $estado = $request->get('estado');

        $query = Cotacao::where('tipo', $tipo)
            ->orderByDesc('referencia_em')
            ->limit(30);

        if ($estado) {
            $query->where('estado', $estado);
        }

        return response()->json($query->get());
    }

    public function ultima(): JsonResponse
    {
        $cotacoes = [];

        foreach (['boi_gordo', 'bezerro', 'vaca'] as $tipo) {
            $cotacoes[$tipo] = Cotacao::where('tipo', $tipo)
                ->orderByDesc('referencia_em')
                ->first();
        }

        return response()->json($cotacoes);
    }
}
