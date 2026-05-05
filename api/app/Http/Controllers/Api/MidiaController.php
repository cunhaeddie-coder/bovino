<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anuncio;
use App\Models\Midia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MidiaController extends Controller
{
    public function upload(Request $request, Anuncio $anuncio): JsonResponse
    {
        if ($anuncio->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $request->validate([
            'arquivo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,mp4,mov', 'max:51200'],
            'ordem' => ['integer', 'min:0', 'max:20'],
        ]);

        $arquivo = $request->file('arquivo');
        $tipo = str_starts_with($arquivo->getMimeType(), 'video') ? 'video' : 'foto';
        $path = $arquivo->store("anuncios/{$anuncio->id}", 'public');

        $midia = $anuncio->midias()->create([
            'tipo' => $tipo,
            'url' => Storage::url($path),
            'ordem' => $request->input('ordem', 0),
        ]);

        return response()->json($midia, 201);
    }

    public function destroy(Request $request, Midia $midia): JsonResponse
    {
        $anuncio = Anuncio::find($midia->anunciavel_id);

        if (!$anuncio || $anuncio->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $path = str_replace('/storage/', '', $midia->url);
        Storage::disk('public')->delete($path);

        $midia->delete();

        return response()->json(['message' => 'Mídia removida.']);
    }
}
