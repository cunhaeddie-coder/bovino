<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class RankingController extends Controller
{
    public function vendedores(): JsonResponse
    {
        $vendedores = User::select('users.id', 'users.nome', 'users.estado', 'users.municipio')
            ->selectRaw('ROUND(AVG(av.nota), 1) as nota_media')
            ->selectRaw('COUNT(DISTINCT av.id) as total_avaliacoes')
            ->selectRaw('COUNT(DISTINCT neg.id) as total_vendas')
            ->join('avaliacoes as av', 'av.vendedor_id', '=', 'users.id')
            ->leftJoin('negociacoes as neg', function ($j) {
                $j->on('neg.vendedor_id', '=', 'users.id')
                  ->where('neg.status', '=', 'concluida');
            })
            ->groupBy('users.id', 'users.nome', 'users.estado', 'users.municipio')
            ->having(DB::raw('COUNT(DISTINCT av.id)'), '>=', 1)
            ->orderByDesc('nota_media')
            ->orderByDesc('total_vendas')
            ->limit(20)
            ->with([
                'fazendas:id,user_id,slug,nome,racas_principais,logo_url',
                'kyc:user_id,kyc_status,status_ibama,status_ie',
            ])
            ->get();

        return response()->json($vendedores);
    }
}
