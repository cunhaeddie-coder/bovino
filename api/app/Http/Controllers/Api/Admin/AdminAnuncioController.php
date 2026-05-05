<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Anuncio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAnuncioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Anuncio::withTrashed()
            ->with(['animal', 'user:id,nome,estado', 'fotos'])
            ->withCount('midias');

        if ($request->filled('busca')) {
            $b = $request->busca;
            $query->where(fn($q) => $q
                ->where('titulo', 'like', "%{$b}%")
                ->orWhereHas('user', fn($u) => $u->where('nome', 'like', "%{$b}%"))
            );
        }

        if ($request->filled('status')) {
            match ($request->status) {
                'ativo'    => $query->whereNull('anuncios.deleted_at')
                    ->where(fn($q) => $q->whereNull('expira_em')->orWhere('expira_em', '>', now())),
                'expirado' => $query->where('expira_em', '<', now()),
                'removido' => $query->onlyTrashed(),
                default    => null,
            };
        }

        if ($request->filled('estado')) {
            $query->whereHas('animal', fn($q) => $q->where('estado', $request->estado));
        }

        $anuncios = $query->orderByDesc('created_at')->paginate(25);

        return response()->json($anuncios);
    }

    public function destacar(int $id): JsonResponse
    {
        $anuncio = Anuncio::findOrFail($id);
        $anuncio->update(['destaque' => !$anuncio->destaque]);

        $msg = $anuncio->destaque ? 'Anúncio destacado.' : 'Destaque removido.';
        return response()->json(['message' => $msg, 'destaque' => $anuncio->destaque]);
    }

    public function remover(int $id): JsonResponse
    {
        $anuncio = Anuncio::findOrFail($id);
        $anuncio->delete();

        return response()->json(['message' => 'Anúncio removido.']);
    }

    public function restaurar(int $id): JsonResponse
    {
        $anuncio = Anuncio::withTrashed()->findOrFail($id);
        $anuncio->restore();

        return response()->json(['message' => 'Anúncio restaurado.']);
    }
}
