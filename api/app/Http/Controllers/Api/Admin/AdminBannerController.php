<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\Anunciante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminBannerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $banners = Banner::with('anunciante:id,empresa')
            ->when($request->anunciante_id, fn($q, $v) => $q->where('anunciante_id', $v))
            ->when($request->posicao, fn($q, $v) => $q->where('posicao', $v))
            ->latest()
            ->paginate(20);

        return response()->json($banners);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'anunciante_id' => ['required', 'exists:anunciantes,id'],
            'imagem_url'    => ['required', 'url'],
            'link_url'      => ['nullable', 'url'],
            'posicao'       => ['required', 'in:home,feed,busca'],
            'ativo'         => ['boolean'],
        ]);

        $banner = Banner::create($data);
        $banner->load('anunciante:id,empresa');

        return response()->json($banner, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);

        $data = $request->validate([
            'imagem_url' => ['sometimes', 'url'],
            'link_url'   => ['nullable', 'url'],
            'posicao'    => ['sometimes', 'in:home,feed,busca'],
            'ativo'      => ['sometimes', 'boolean'],
        ]);

        $banner->update($data);

        return response()->json($banner->load('anunciante:id,empresa'));
    }

    public function toggleAtivo(int $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);
        $banner->update(['ativo' => !$banner->ativo]);

        return response()->json(['ativo' => $banner->ativo]);
    }

    public function destroy(int $id): JsonResponse
    {
        Banner::findOrFail($id)->delete();
        return response()->json(['message' => 'Banner removido.']);
    }

    public function anunciantes(): JsonResponse
    {
        $anunciantes = Anunciante::where('ativo', true)
            ->select('id', 'empresa')
            ->orderBy('empresa')
            ->get();

        return response()->json($anunciantes);
    }
}
