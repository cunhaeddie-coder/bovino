<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BannerController extends Controller
{
    public function porPosicao(Request $request): JsonResponse
    {
        $posicao = $request->validate(['posicao' => ['required', 'in:feed,busca,home']])['posicao'];

        $banners = Banner::with('anunciante:id,empresa')
            ->where('posicao', $posicao)
            ->where('ativo', true)
            ->whereHas('anunciante', fn($q) => $q->where('validade', '>=', now()))
            ->inRandomOrder()
            ->limit(3)
            ->get();

        return response()->json($banners);
    }

    public function registrarImpressao(Banner $banner): JsonResponse
    {
        $banner->increment('impressoes');
        return response()->json(['ok' => true]);
    }

    public function registrarClique(Banner $banner): JsonResponse
    {
        $banner->increment('cliques');
        return response()->json(['ok' => true, 'link' => $banner->link_url]);
    }
}
