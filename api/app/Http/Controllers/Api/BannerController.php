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
        $estado   = $request->query('estado');
        $municipio = $request->query('municipio');

        $banners = Banner::with('anunciante:id,empresa')
            ->where('posicao', $posicao)
            ->where('ativo', true)
            ->whereHas('anunciante', fn($q) => $q->where('validade', '>=', now()))
            ->where(function ($q) use ($estado, $municipio) {
                // Nacional: sempre visível
                $q->where('abrangencia', 'nacional');

                // Estadual: visível se o estado do usuário estiver na lista
                if ($estado) {
                    $q->orWhere(function ($s) use ($estado) {
                        $s->where('abrangencia', 'estadual')
                          ->whereJsonContains('estados', $estado);
                    });
                }

                // Municipal: visível se município E estado baterem
                if ($municipio && $estado) {
                    $q->orWhere(function ($s) use ($municipio) {
                        $s->where('abrangencia', 'municipal')
                          ->whereJsonContains('municipios', $municipio);
                    });
                }
            })
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
