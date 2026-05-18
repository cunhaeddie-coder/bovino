<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Custo;
use App\Models\EventoSaude;
use App\Models\LoteGestao;
use App\Models\Pesagem;
use App\Models\ReceitaFazenda;
use App\Models\Rebanho;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoviScoreController extends Controller
{
    public function calcular(Request $request): JsonResponse
    {
        $fazenda = $request->user()->fazenda;
        abort_if(!$fazenda, 403, 'Cadastre sua fazenda primeiro.');

        $fid = $fazenda->id;

        // 1. GMD Score (0-30)
        $gmdMedio = Pesagem::where('fazenda_id', $fid)
            ->whereNotNull('gmd')
            ->where('data_pesagem', '>=', now()->subDays(60))
            ->avg('gmd') ?? 0;

        $gmdScore = match(true) {
            $gmdMedio >= 1.0 => 30,
            $gmdMedio >= 0.8 => 25,
            $gmdMedio >= 0.6 => 18,
            $gmdMedio >= 0.4 => 10,
            $gmdMedio >= 0.1 => 5,
            default          => 0,
        };
        $temGmd = $gmdMedio > 0;

        // 2. Saúde Score (0-25)
        $totalAlertas = EventoSaude::where('fazenda_id', $fid)
            ->whereNotNull('proxima_dose')
            ->count();
        $alertasVencidos = EventoSaude::where('fazenda_id', $fid)
            ->whereNotNull('proxima_dose')
            ->where('proxima_dose', '<', now())
            ->count();

        $saudeScore = $totalAlertas === 0
            ? 14 // neutro: sem dados de saúde
            : match(true) {
                $alertasVencidos === 0                              => 25,
                $alertasVencidos / $totalAlertas < 0.1             => 20,
                $alertasVencidos / $totalAlertas < 0.3             => 12,
                default                                            => 4,
            };

        // 3. Financeiro Score (0-25)
        $totalCustos   = Custo::where('fazenda_id', $fid)->sum('valor');
        $totalReceitas = ReceitaFazenda::where('fazenda_id', $fid)->sum('valor');
        $resultado     = $totalReceitas - $totalCustos;

        $finScore = $totalCustos == 0 && $totalReceitas == 0
            ? 12 // neutro: sem dados financeiros
            : match(true) {
                $resultado > 0  => 25,
                $resultado == 0 => 14,
                default         => 4,
            };

        // 4. Completude de Dados (0-20)
        $totalAnimais = Rebanho::where('fazenda_id', $fid)->where('status', 'ativo')->count();
        $comPeso      = Rebanho::where('fazenda_id', $fid)->where('status', 'ativo')
            ->whereNotNull('peso_atual')->where('peso_atual', '>', 0)->count();

        $pctDados = $totalAnimais > 0 ? $comPeso / $totalAnimais : 0;

        $dadosScore = match(true) {
            $pctDados >= 0.8 => 20,
            $pctDados >= 0.6 => 15,
            $pctDados >= 0.4 => 10,
            $pctDados >= 0.1 => 5,
            default          => 2,
        };

        $score = $gmdScore + $saudeScore + $finScore + $dadosScore;

        $grau = match(true) {
            $score >= 80 => ['letra' => 'A', 'label' => 'Excelente', 'cor' => 'green'],
            $score >= 60 => ['letra' => 'B', 'label' => 'Bom',       'cor' => 'blue'],
            $score >= 40 => ['letra' => 'C', 'label' => 'Regular',   'cor' => 'yellow'],
            default      => ['letra' => 'D', 'label' => 'Atenção',   'cor' => 'red'],
        };

        return response()->json([
            'score'        => $score,
            'grau'         => $grau,
            'componentes'  => [
                ['nome' => 'Desempenho Animal', 'pontos' => $gmdScore, 'max' => 30,
                 'detalhe' => $temGmd ? "GMD médio: {$gmdMedio} kg/dia" : "Sem pesagens recentes"],
                ['nome' => 'Saúde do Rebanho',  'pontos' => $saudeScore, 'max' => 25,
                 'detalhe' => $totalAlertas > 0 ? "{$alertasVencidos} alertas vencidos de {$totalAlertas}" : "Sem eventos de saúde registrados"],
                ['nome' => 'Resultado Financeiro','pontos' => $finScore, 'max' => 25,
                 'detalhe' => $totalCustos > 0 ? ($resultado >= 0 ? "Resultado positivo" : "Resultado negativo") : "Sem lançamentos financeiros"],
                ['nome' => 'Completude de Dados','pontos' => $dadosScore, 'max' => 20,
                 'detalhe' => $totalAnimais > 0 ? round($pctDados * 100) . "% dos animais com peso" : "Sem animais cadastrados"],
            ],
        ]);
    }
}
