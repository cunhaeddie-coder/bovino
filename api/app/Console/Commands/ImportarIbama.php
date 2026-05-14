<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ImportarIbama extends Command
{
    protected $signature   = 'ibama:importar {--url= : URL alternativa do CSV}';
    protected $description = 'Importa lista de áreas embargadas do IBAMA';

    // URL pública da lista de embargos (IBAMA atualiza periodicamente)
    private const URL_IBAMA = 'https://servicos.ibama.gov.br/ctf/publico/areasembargadas/tabela_areas_embargadas.csv';

    public function handle(): int
    {
        $url = $this->option('url') ?? self::URL_IBAMA;

        $this->info("Baixando lista de embargos IBAMA...");

        try {
            $resp = Http::timeout(120)->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; Bovino/1.0)',
            ])->get($url);

            if ($resp->failed()) {
                $this->error("Falha ao baixar: HTTP {$resp->status()}");
                return self::FAILURE;
            }

            $csv = $resp->body();
            $linhas = preg_split('/\r?\n/', $csv);
            $cabecalho = null;
            $inseridos = 0;
            $lote = [];

            DB::table('ibama_embargos')->truncate();

            foreach ($linhas as $i => $linha) {
                if (empty(trim($linha))) continue;

                // Detecta separador
                $sep = str_contains($linha, ';') ? ';' : ',';
                $cols = str_getcsv($linha, $sep);

                if ($i === 0) {
                    $cabecalho = array_map('mb_strtolower', array_map('trim', $cols));
                    continue;
                }

                if (!$cabecalho || count($cols) < 3) continue;

                $row = array_combine(array_slice($cabecalho, 0, count($cols)), $cols);

                // Mapeia nomes de coluna comuns do IBAMA
                $cpfCnpj  = preg_replace('/\D/', '', $row['cpf/cnpj'] ?? $row['cpf_cnpj'] ?? $row['documento'] ?? '');
                $nome     = $row['nome'] ?? $row['infrator'] ?? null;
                $municipio= $row['municipio'] ?? $row['município'] ?? null;
                $estado   = strtoupper($row['uf'] ?? $row['estado'] ?? '');
                $numTad   = $row['num_tad'] ?? $row['auto_infracao'] ?? null;
                $situacao = strtolower($row['situacao'] ?? $row['situação'] ?? 'ativo');
                $situacao = str_contains($situacao, 'cancel') ? 'cancelado' : 'ativo';

                $dataEmb  = null;
                $rawData  = $row['data_embargo'] ?? $row['data'] ?? null;
                if ($rawData) {
                    try { $dataEmb = \Carbon\Carbon::parse($rawData)->format('Y-m-d'); } catch (\Exception) {}
                }

                if (!$cpfCnpj) continue;

                $lote[] = compact('cpfCnpj', 'nome', 'municipio', 'estado', 'numTad', 'situacao', 'dataEmb');

                if (count($lote) >= 500) {
                    $this->inserirLote($lote);
                    $inseridos += count($lote);
                    $lote = [];
                    $this->info("  {$inseridos} registros importados...");
                }
            }

            if ($lote) {
                $this->inserirLote($lote);
                $inseridos += count($lote);
            }

            $this->info("✅ IBAMA importado: {$inseridos} áreas embargadas.");
            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Erro: " . $e->getMessage());
            return self::FAILURE;
        }
    }

    private function inserirLote(array $lote): void
    {
        $rows = array_map(fn($r) => [
            'cpf_cnpj'      => $r['cpfCnpj'],
            'nome'          => $r['nome'],
            'municipio'     => $r['municipio'],
            'estado'        => $r['estado'],
            'num_tad'       => $r['numTad'],
            'situacao'      => $r['situacao'],
            'data_embargo'  => $r['dataEmb'],
            'importado_em'  => now(),
        ], $lote);

        DB::table('ibama_embargos')->insert($rows);
    }
}
