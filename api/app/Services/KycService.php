<?php

namespace App\Services;

use App\Models\VendorKyc;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KycService
{
    // ── Receita Federal via BrasilAPI (gratuita) ─────────────────────────────

    public function verificarCnpj(string $cnpj): array
    {
        $cnpj = preg_replace('/\D/', '', $cnpj);

        try {
            $resp = Http::timeout(10)->get("https://brasilapi.com.br/api/cnpj/v1/{$cnpj}");

            if ($resp->failed()) {
                return ['status' => 'nao_verificado', 'nome' => null, 'dados' => null];
            }

            $data = $resp->json();
            $ativo = ($data['situacao_cadastral'] ?? '') === '02'; // 02 = Ativa

            return [
                'status' => $ativo ? 'ok' : 'inativo',
                'nome'   => $data['razao_social'] ?? null,
                'dados'  => $data,
            ];
        } catch (\Exception $e) {
            Log::warning("KYC CNPJ error: " . $e->getMessage());
            return ['status' => 'nao_verificado', 'nome' => null, 'dados' => null];
        }
    }

    public function verificarCpf(string $cpf): array
    {
        $cpf = preg_replace('/\D/', '', $cpf);

        // Valida dígitos verificadores
        if (!$this->cpfValido($cpf)) {
            return ['status' => 'invalido', 'nome' => null, 'dados' => null];
        }

        // CPF estruturalmente válido — confirmação real via BaaS selfie
        return ['status' => 'ok', 'nome' => null, 'dados' => null];
    }

    // ── IBAMA — API pública ArcGIS PAMGIA (tempo real) ───────────────────────

    private const IBAMA_API = 'https://pamgia.ibama.gov.br/server/rest/services/01_Publicacoes_Bases/adm_embargos_ibama_a/FeatureServer/0/query';

    public function verificarIbama(string $cpfCnpj): array
    {
        $doc = preg_replace('/\D/', '', $cpfCnpj);

        try {
            $resp = Http::timeout(15)->get(self::IBAMA_API, [
                'where'      => "cpf_cnpj_embargado='{$doc}'",
                'outFields'  => 'cpf_cnpj_embargado,nome_embargado,municipio,uf,dat_embargo,des_infracao',
                'resultRecordCount' => 5,
                'f'          => 'json',
            ]);

            if ($resp->failed()) {
                Log::warning("IBAMA API falhou: HTTP {$resp->status()}");
                return $this->verificarIbamaLocal($doc);
            }

            $data = $resp->json();

            if (!empty($data['error'])) {
                Log::warning("IBAMA API erro: " . json_encode($data['error']));
                return $this->verificarIbamaLocal($doc);
            }

            $features = $data['features'] ?? [];

            if (!empty($features)) {
                $attrs = $features[0]['attributes'] ?? [];
                return [
                    'status'   => 'embargado',
                    'detalhe'  => [
                        'nome'       => $attrs['nome_embargado'] ?? null,
                        'municipio'  => $attrs['municipio'] ?? null,
                        'uf'         => $attrs['uf'] ?? null,
                        'data'       => $attrs['dat_embargo'] ?? null,
                        'infracao'   => $attrs['des_infracao'] ?? null,
                        'total'      => count($features),
                    ],
                ];
            }

            return ['status' => 'ok'];

        } catch (\Exception $e) {
            Log::warning("IBAMA API exception: " . $e->getMessage());
            return $this->verificarIbamaLocal($doc);
        }
    }

    // Fallback: tabela local (importada via artisan ibama:importar)
    private function verificarIbamaLocal(string $doc): array
    {
        $embargo = DB::table('ibama_embargos')
            ->where('cpf_cnpj', $doc)
            ->where('situacao', 'ativo')
            ->first();

        if ($embargo) {
            return ['status' => 'embargado', 'detalhe' => (array) $embargo];
        }

        $total = DB::table('ibama_embargos')->count();
        return ['status' => $total > 0 ? 'ok' : 'nao_verificado'];
    }

    // ── IE — valida formato por estado ────────────────────────────────────────

    public function verificarIe(string $estado, string $ie): array
    {
        $ie = preg_replace('/\D/', '', $ie);

        $minMax = [
            'SP' => [12, 12], 'MG' => [13, 13], 'RS' => [10, 10],
            'MT' => [11, 11], 'MS' => [9, 9],   'GO' => [9, 9],
            'PR' => [10, 10], 'BA' => [8, 8],   'PA' => [9, 9],
            'MA' => [9, 9],   'RO' => [9, 14],  'TO' => [11, 11],
        ];

        if (isset($minMax[$estado])) {
            [$min, $max] = $minMax[$estado];
            if (strlen($ie) < $min || strlen($ie) > $max) {
                return ['status' => 'invalido'];
            }
        }

        // Formato ok — validação profunda via Infosimples na Fase 2
        return ['status' => 'ok'];
    }

    // ── Executa KYC completo e salva resultado ────────────────────────────────

    public function executar(VendorKyc $kyc): void
    {
        $kyc->update(['kyc_status' => 'validando']);

        // 1. Receita Federal
        if ($kyc->tipo_documento === 'cnpj') {
            $receita = $this->verificarCnpj($kyc->cpf_cnpj);
        } else {
            $receita = $this->verificarCpf($kyc->cpf_cnpj);
        }
        $kyc->status_receita         = $receita['status'];
        $kyc->nome_receita           = $receita['nome'];
        $kyc->dados_receita          = $receita['dados'];
        $kyc->verificado_receita_em  = now();

        // 2. IBAMA
        $ibama = $this->verificarIbama($kyc->cpf_cnpj);
        $kyc->status_ibama          = $ibama['status'];
        $kyc->verificado_ibama_em   = now();

        // 3. IE
        if ($kyc->inscricao_estadual && $kyc->estado_propriedade) {
            $ie = $this->verificarIe($kyc->estado_propriedade, $kyc->inscricao_estadual);
            $kyc->status_ie = $ie['status'];
        }

        // 4. Determina status final
        $ibamaBloqueado = $ibama['status'] === 'embargado';
        $receitaInvalido = in_array($receita['status'], ['invalido', 'inativo']);

        if ($ibamaBloqueado) {
            $kyc->kyc_status         = 'reprovado';
            $kyc->motivo_reprovacao  = 'Propriedade com embargo IBAMA ativo.';
        } elseif ($receitaInvalido) {
            $kyc->kyc_status         = 'reprovado';
            $kyc->motivo_reprovacao  = 'CPF/CNPJ inválido ou inativo na Receita Federal.';
        } elseif ($kyc->status_ie === 'invalido') {
            $kyc->kyc_status = 'revisao_manual';
            $kyc->motivo_reprovacao = 'Inscrição Estadual com formato inválido.';
        } elseif ($kyc->status_selfie !== 'ok') {
            $kyc->kyc_status = 'revisao_manual'; // aguarda selfie via BaaS
        } else {
            $kyc->kyc_status  = 'aprovado';
            $kyc->aprovado_em = now();
        }

        $kyc->save();
    }

    // ── Utilitário CPF ────────────────────────────────────────────────────────

    private function cpfValido(string $cpf): bool
    {
        if (strlen($cpf) !== 11 || preg_match('/^(\d)\1+$/', $cpf)) return false;

        for ($t = 9; $t < 11; $t++) {
            $sum = 0;
            for ($i = 0; $i < $t; $i++) {
                $sum += (int)$cpf[$i] * ($t + 1 - $i);
            }
            $rem = $sum % 11;
            if ((int)$cpf[$t] !== ($rem < 2 ? 0 : 11 - $rem)) return false;
        }

        return true;
    }
}
