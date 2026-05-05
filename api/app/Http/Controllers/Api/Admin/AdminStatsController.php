<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Anunciante;
use App\Models\Anuncio;
use App\Models\Assinatura;
use App\Models\BuscaLog;
use App\Models\Fazenda;
use App\Models\Pagamento;
use App\Models\Rebanho;
use App\Models\Visita;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminStatsController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $hoje = now()->startOfDay();
        $mes  = now()->startOfMonth();
        $mesAnterior = now()->subMonth()->startOfMonth();
        $fimMesAnterior = now()->subMonth()->endOfMonth();

        // KPIs principais
        $totalUsuarios    = User::count();
        $usuariosAtivos   = User::whereNull('deleted_at')->count();
        $novosHoje        = User::whereDate('created_at', today())->count();
        $novosMes         = User::where('created_at', '>=', $mes)->count();

        $totalAnuncios    = Anuncio::count();
        $anunciosAtivos   = Anuncio::whereNull('deleted_at')
            ->where(fn($q) => $q->whereNull('expira_em')->orWhere('expira_em', '>', now()))
            ->count();

        $assinaturasAtivas = Assinatura::where('status', 'ativa')->count();

        // MRR — soma dos planos com assinatura ativa
        $mrr = Assinatura::where('status', 'ativa')
            ->join('planos', 'assinaturas.plano_id', '=', 'planos.id')
            ->sum('planos.preco');

        // Receita do mês atual
        $receitaMes = Pagamento::where('status', 'aprovado')
            ->where('created_at', '>=', $mes)
            ->sum('valor');

        // Receita mês anterior (para % de variação)
        $receitaMesAnterior = Pagamento::where('status', 'aprovado')
            ->whereBetween('created_at', [$mesAnterior, $fimMesAnterior])
            ->sum('valor');

        $variacaoReceita = $receitaMesAnterior > 0
            ? round((($receitaMes - $receitaMesAnterior) / $receitaMesAnterior) * 100, 1)
            : null;

        // Usuários por tipo
        $porTipo = User::select('tipo', DB::raw('count(*) as total'))
            ->groupBy('tipo')
            ->pluck('total', 'tipo');

        // Anunciantes
        $totalAnunciantes  = Anunciante::count();
        $anunciantesAtivos = Anunciante::where('ativo', true)->count();

        return response()->json([
            'usuarios' => [
                'total'       => $totalUsuarios,
                'ativos'      => $usuariosAtivos,
                'novos_hoje'  => $novosHoje,
                'novos_mes'   => $novosMes,
                'por_tipo'    => $porTipo,
            ],
            'anuncios' => [
                'total'  => $totalAnuncios,
                'ativos' => $anunciosAtivos,
            ],
            'financeiro' => [
                'mrr'                  => round($mrr, 2),
                'receita_mes'          => round($receitaMes, 2),
                'receita_mes_anterior' => round($receitaMesAnterior, 2),
                'variacao_receita'     => $variacaoReceita,
                'assinaturas_ativas'   => $assinaturasAtivas,
            ],
            'anunciantes' => [
                'total'  => $totalAnunciantes,
                'ativos' => $anunciantesAtivos,
            ],
            'gestao' => [
                'fazendas'       => Fazenda::where('ativo', true)->count(),
                'animais_rebanho'=> Rebanho::where('status', 'ativo')->count(),
                'visitas_pendentes' => Visita::where('status', 'pendente')->count(),
                'buscas_hoje'    => BuscaLog::whereDate('created_at', today())->count(),
            ],
        ]);
    }

    public function crescimento(): JsonResponse
    {
        // Novos usuários por dia nos últimos 30 dias
        $usuarios = User::select(
                DB::raw('DATE(created_at) as dia'),
                DB::raw('count(*) as total')
            )
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('dia')
            ->orderBy('dia')
            ->get();

        // Receita por dia nos últimos 30 dias
        $receita = Pagamento::select(
                DB::raw('DATE(created_at) as dia'),
                DB::raw('sum(valor) as total')
            )
            ->where('status', 'aprovado')
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('dia')
            ->orderBy('dia')
            ->get();

        // Novas assinaturas por dia nos últimos 30 dias
        $assinaturas = Assinatura::select(
                DB::raw('DATE(created_at) as dia'),
                DB::raw('count(*) as total')
            )
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('dia')
            ->orderBy('dia')
            ->get();

        return response()->json([
            'usuarios'    => $usuarios,
            'receita'     => $receita,
            'assinaturas' => $assinaturas,
        ]);
    }

    public function assinaturasPorPlano(): JsonResponse
    {
        $dados = Assinatura::select('plano_id', DB::raw('count(*) as total'))
            ->where('status', 'ativa')
            ->with('plano:id,nome,tipo,preco')
            ->groupBy('plano_id')
            ->get()
            ->map(fn($a) => [
                'plano'  => $a->plano?->nome,
                'tipo'   => $a->plano?->tipo,
                'preco'  => $a->plano?->preco,
                'total'  => $a->total,
                'receita'=> ($a->plano?->preco ?? 0) * $a->total,
            ]);

        return response()->json($dados);
    }
}
