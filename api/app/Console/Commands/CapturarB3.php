<?php

namespace App\Console\Commands;

use App\Models\Cotacao;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class CapturarB3 extends Command
{
    protected $signature = 'b3:capturar {--force : Sobrescreve registro do dia mesmo se já existir}';
    protected $description = 'Captura e persiste o ajuste diário do BGI na B3';

    public function handle(): int
    {
        try {
            $resp = Http::timeout(15)
                ->withHeaders(['Accept' => 'application/json'])
                ->get('https://cotacao.b3.com.br/mds/api/v1/derivativeQuotation/BGI');

            if (!$resp->ok()) {
                $this->error("B3 API HTTP {$resp->status()}");
                return Command::FAILURE;
            }

            $contrato = collect($resp->json('Scty') ?? [])
                ->filter(fn($s) => ($s['mkt']['cd'] ?? '') === 'FUT')
                ->filter(fn($s) => ($s['SctyQtn']['prvsDayAdjstmntPric'] ?? 0) > 0)
                ->sortByDesc(fn($s) => $s['asset']['AsstSummry']['opnCtrcts'] ?? 0)
                ->first();

            if (!$contrato) {
                $this->warn('Nenhum contrato FUT com ajuste encontrado.');
                return Command::FAILURE;
            }

            $qtn    = $contrato['SctyQtn'];
            $ajuste = (float) ($qtn['prvsDayAdjstmntPric'] ?? 0);
            $curPrc = (float) ($qtn['curPrc'] ?? 0);
            $bid    = (float) ($contrato['buyOffer']['price']  ?? 0);
            $ask    = (float) ($contrato['sellOffer']['price'] ?? 0);

            // Preço de referência: atual > médio bid/ask > ajuste anterior
            $preco = $curPrc > 0 ? $curPrc
                : ($bid > 0 && $ask > 0 ? round(($bid + $ask) / 2, 2) : $ajuste);

            if ($preco <= 0) {
                $this->warn('Preço zerado, ignorando.');
                return Command::FAILURE;
            }

            $hoje = now()->toDateString();

            $existente = Cotacao::where('tipo', 'boi_gordo')
                ->where('fonte', 'B3')
                ->whereDate('referencia_em', $hoje)
                ->first();

            if ($existente && !$this->option('force')) {
                // Atualiza apenas se o novo preço for "mais preciso" (curPrc > ajuste)
                if ($curPrc > 0 || $existente->preco_arroba == 0) {
                    $existente->update(['preco_arroba' => round($preco, 2)]);
                    $this->info("B3 BGI atualizado: R$ {$preco} em {$hoje}");
                } else {
                    $this->line("B3 BGI já registrado hoje: R$ {$existente->preco_arroba}");
                }
                return Command::SUCCESS;
            }

            Cotacao::updateOrCreate(
                ['tipo' => 'boi_gordo', 'fonte' => 'B3', 'referencia_em' => $hoje],
                ['preco_arroba' => round($preco, 2), 'estado' => null]
            );

            $this->info("B3 BGI capturado: R$ {$preco} em {$hoje}");
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Erro: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
