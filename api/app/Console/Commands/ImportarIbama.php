<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ImportarIbama extends Command
{
    protected $signature   = 'ibama:importar {--url= : URL do CSV} {--arquivo= : Caminho para arquivo CSV local}';
    protected $description = 'Importa lista de áreas embargadas do IBAMA';

    private const URLS = [
        'https://www.ibama.gov.br/images/areas_embargadas/tabela_areas_embargadas.csv',
        'https://servicos.ibama.gov.br/ctf/publico/areasembargadas/tabela_areas_embargadas.csv',
        'https://dadosabertos.ibama.gov.br/dados/AUTUACOES/areas_embargadas.csv',
    ];

    public function handle(): int
    {
        if ($arquivo = $this->option('arquivo')) {
            if (!file_exists($arquivo)) {
                $this->error("Arquivo não encontrado: {$arquivo}");
                return self::FAILURE;
            }
            $this->info("Importando de arquivo local: {$arquivo}");
            return $this->processar(file_get_contents($arquivo));
        }

        $urls = $this->option('url') ? [$this->option('url')] : self::URLS;

        foreach ($urls as $url) {
            $this->info("Tentando: {$url}");
            try {
                $resp = Http::timeout(60)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; Bovino/1.0)'])
                    ->get($url);

                if ($resp->successful()) {
                    $this->info("Download OK.");
                    return $this->processar($resp->body());
                }
                $this->warn("HTTP {$resp->status()} — próxima URL...");
            } catch (\Exception $e) {
                $this->warn("Erro: " . $e->getMessage());
            }
        }

        $this->error("Não foi possível baixar a lista do IBAMA.");
        $this->line("Para importar manualmente:");
        $this->line("  1. Acesse https://www.ibama.gov.br/areas-embargadas");
        $this->line("  2. Baixe o CSV de áreas embargadas");
        $this->line("  3. Execute: php artisan ibama:importar --arquivo=/caminho/arquivo.csv");
        return self::FAILURE;
    }

    private function processar(string $csv): int
    {
        if (empty(trim($csv))) {
            $this->error("CSV vazio.");
            return self::FAILURE;
        }

        $linhas    = preg_split('/\r?\n/', $csv);
        $cabecalho = null;
        $inseridos = 0;
        $lote      = [];

        DB::table('ibama_embargos')->truncate();

        foreach ($linhas as $i => $linha) {
            if (empty(trim($linha))) continue;

            $sep  = str_contains($linha, ';') ? ';' : ',';
            $cols = str_getcsv($linha, $sep);

            if ($i === 0) {
                $cabecalho = array_map('mb_strtolower', array_map('trim', $cols));
                continue;
            }

            if (!$cabecalho || count($cols) < 3) continue;

            $row = array_combine(array_slice($cabecalho, 0, count($cols)), $cols);

            $cpfCnpj   = preg_replace('/\D/', '', $row['cpf/cnpj'] ?? $row['cpf_cnpj'] ?? $row['documento'] ?? '');
            $nome      = $row['nome'] ?? $row['infrator'] ?? null;
            $municipio = $row['municipio'] ?? $row['município'] ?? null;
            $estado    = strtoupper($row['uf'] ?? $row['estado'] ?? '');
            $numTad    = $row['num_tad'] ?? $row['auto_infracao'] ?? null;
            $situacao  = str_contains(strtolower($row['situacao'] ?? $row['situação'] ?? ''), 'cancel') ? 'cancelado' : 'ativo';
            $dataEmb   = null;

            $rawData = $row['data_embargo'] ?? $row['data'] ?? null;
            if ($rawData) {
                try { $dataEmb = \Carbon\Carbon::parse($rawData)->format('Y-m-d'); } catch (\Exception) {}
            }

            if (!$cpfCnpj) continue;

            $lote[] = [
                'cpf_cnpj'     => $cpfCnpj,
                'nome'         => $nome,
                'municipio'    => $municipio,
                'estado'       => $estado,
                'num_tad'      => $numTad,
                'situacao'     => $situacao,
                'data_embargo' => $dataEmb,
                'importado_em' => now(),
            ];

            if (count($lote) >= 500) {
                DB::table('ibama_embargos')->insert($lote);
                $inseridos += count($lote);
                $lote = [];
                $this->info("  {$inseridos} registros importados...");
            }
        }

        if ($lote) {
            DB::table('ibama_embargos')->insert($lote);
            $inseridos += count($lote);
        }

        $this->info("✅ IBAMA importado: {$inseridos} áreas embargadas.");
        return self::SUCCESS;
    }
}
