<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Avaliacao;
use Illuminate\Http\Request;

class AdminAvaliacaoController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Avaliacao::with([
                'vendedor:id,nome',
                'comprador:id,nome',
                'anuncio:id,titulo,raca',
            ])
            ->when($request->nota, fn($q) => $q->where('nota', $request->nota))
            ->when($request->confirmada, fn($q) => $q->where('negociacao_confirmada', true))
            ->latest()
            ->paginate(25)
        );
    }

    public function destroy(int $id)
    {
        Avaliacao::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
