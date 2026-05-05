<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Fazenda;
use Illuminate\Http\Request;

class AdminFazendaController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Fazenda::with('user:id,nome,email,celular,estado')
                ->when($request->busca, fn($q) => $q->where('nome', 'like', "%{$request->busca}%")
                    ->orWhere('municipio', 'like', "%{$request->busca}%"))
                ->when($request->estado, fn($q) => $q->where('estado', $request->estado))
                ->withCount(['rebanho', 'lotes'])
                ->latest()
                ->paginate(20)
        );
    }

    public function show(int $id)
    {
        $fazenda = Fazenda::with([
            'user:id,nome,email,celular',
            'pastagens',
            'lotes' => fn($q) => $q->withCount('animais'),
        ])
        ->withCount('rebanho')
        ->findOrFail($id);

        return response()->json([
            ...$fazenda->toArray(),
            'nota_media'   => $fazenda->nota_media,
            'total_vendas' => $fazenda->total_vendas,
        ]);
    }

    public function toggleAtivo(int $id)
    {
        $fazenda = Fazenda::findOrFail($id);
        $fazenda->update(['ativo' => !$fazenda->ativo]);
        return response()->json(['ativo' => $fazenda->ativo]);
    }
}
