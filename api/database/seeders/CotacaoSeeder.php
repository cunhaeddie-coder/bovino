<?php

namespace Database\Seeders;

use App\Models\Cotacao;
use Illuminate\Database\Seeder;

class CotacaoSeeder extends Seeder
{
    public function run(): void
    {
        $hoje = now()->toDateString();
        $ontem = now()->subDay()->toDateString();

        $registros = [
            // ── BOI GORDO (R$/@ — CEPEA/ESALQ, mai/2026) ────────────────
            ['tipo' => 'boi_gordo', 'estado' => 'SP', 'preco_arroba' => 318.50, 'referencia_em' => $hoje],
            ['tipo' => 'boi_gordo', 'estado' => 'GO', 'preco_arroba' => 308.20, 'referencia_em' => $hoje],
            ['tipo' => 'boi_gordo', 'estado' => 'MT', 'preco_arroba' => 296.80, 'referencia_em' => $hoje],
            ['tipo' => 'boi_gordo', 'estado' => 'MS', 'preco_arroba' => 302.40, 'referencia_em' => $hoje],
            ['tipo' => 'boi_gordo', 'estado' => 'MG', 'preco_arroba' => 312.90, 'referencia_em' => $hoje],
            ['tipo' => 'boi_gordo', 'estado' => 'PR', 'preco_arroba' => 315.10, 'referencia_em' => $hoje],
            ['tipo' => 'boi_gordo', 'estado' => 'BA', 'preco_arroba' => 290.60, 'referencia_em' => $hoje],
            ['tipo' => 'boi_gordo', 'estado' => 'PA', 'preco_arroba' => 285.30, 'referencia_em' => $hoje],

            // ── BOI GORDO — dia anterior (para histórico) ──────────────
            ['tipo' => 'boi_gordo', 'estado' => 'SP', 'preco_arroba' => 317.00, 'referencia_em' => $ontem],
            ['tipo' => 'boi_gordo', 'estado' => 'GO', 'preco_arroba' => 307.50, 'referencia_em' => $ontem],
            ['tipo' => 'boi_gordo', 'estado' => 'MT', 'preco_arroba' => 295.20, 'referencia_em' => $ontem],
            ['tipo' => 'boi_gordo', 'estado' => 'MS', 'preco_arroba' => 300.80, 'referencia_em' => $ontem],

            // ── BEZERRO (R$/@ Nelore — referência CEPEA) ──────────────
            ['tipo' => 'bezerro', 'estado' => 'GO', 'preco_arroba' => 142.50, 'referencia_em' => $hoje],
            ['tipo' => 'bezerro', 'estado' => 'MT', 'preco_arroba' => 138.80, 'referencia_em' => $hoje],
            ['tipo' => 'bezerro', 'estado' => 'MS', 'preco_arroba' => 140.20, 'referencia_em' => $hoje],
            ['tipo' => 'bezerro', 'estado' => 'MG', 'preco_arroba' => 145.60, 'referencia_em' => $hoje],
            ['tipo' => 'bezerro', 'estado' => 'SP', 'preco_arroba' => 148.90, 'referencia_em' => $hoje],

            // ── VACA (R$/@ — CEPEA) ───────────────────────────────────
            ['tipo' => 'vaca', 'estado' => 'SP', 'preco_arroba' => 238.40, 'referencia_em' => $hoje],
            ['tipo' => 'vaca', 'estado' => 'GO', 'preco_arroba' => 228.70, 'referencia_em' => $hoje],
            ['tipo' => 'vaca', 'estado' => 'MT', 'preco_arroba' => 220.50, 'referencia_em' => $hoje],
            ['tipo' => 'vaca', 'estado' => 'MG', 'preco_arroba' => 234.10, 'referencia_em' => $hoje],
            ['tipo' => 'vaca', 'estado' => 'MS', 'preco_arroba' => 225.80, 'referencia_em' => $hoje],
        ];

        foreach ($registros as $dado) {
            Cotacao::firstOrCreate(
                ['tipo' => $dado['tipo'], 'estado' => $dado['estado'], 'referencia_em' => $dado['referencia_em']],
                array_merge($dado, ['fonte' => 'CEPEA/ESALQ'])
            );
        }
    }
}
