<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VendorKyc;
use App\Services\KycService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VendorKycController extends Controller
{
    public function __construct(private KycService $kyc) {}

    // ── Status atual do KYC ───────────────────────────────────────────────────

    public function status(Request $request): JsonResponse
    {
        $kyc = VendorKyc::where('user_id', $request->user()->id)->first();

        if (!$kyc) {
            return response()->json(['kyc_status' => 'nao_iniciado', 'badges' => []]);
        }

        return response()->json([
            'kyc_status'      => $kyc->kyc_status,
            'status_receita'  => $kyc->status_receita,
            'status_ie'       => $kyc->status_ie,
            'status_ibama'    => $kyc->status_ibama,
            'status_selfie'   => $kyc->status_selfie,
            'nome_receita'    => $kyc->nome_receita,
            'motivo_reprovacao' => $kyc->motivo_reprovacao,
            'aprovado_em'     => $kyc->aprovado_em,
            'badges'          => $kyc->badges(),
        ]);
    }

    // ── Enviar/atualizar dados KYC ────────────────────────────────────────────

    public function salvar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cpf_cnpj'           => ['required', 'string', 'min:11', 'max:18'],
            'tipo_documento'     => ['required', 'in:cpf,cnpj'],
            'inscricao_estadual' => ['nullable', 'string', 'max:30'],
            'car_numero'         => ['nullable', 'string', 'max:50'],
            'estado_propriedade' => ['nullable', 'string', 'size:2'],
        ]);

        $userId = $request->user()->id;

        $kyc = VendorKyc::updateOrCreate(
            ['user_id' => $userId],
            array_merge($data, ['kyc_status' => 'pendente'])
        );

        // Executa validações automáticas
        $this->kyc->executar($kyc);

        return response()->json([
            'kyc_status'   => $kyc->fresh()->kyc_status,
            'badges'       => $kyc->fresh()->badges(),
            'motivo'       => $kyc->fresh()->motivo_reprovacao,
        ]);
    }

    // ── Badges públicos de um usuário/anunciante ──────────────────────────────

    public function badgesPublicos(int $userId): JsonResponse
    {
        $kyc = VendorKyc::where('user_id', $userId)
            ->where('kyc_status', 'aprovado')
            ->first();

        if (!$kyc) {
            return response()->json(['verificado' => false, 'badges' => []]);
        }

        // Também conta negociações concluídas e média de avaliações
        $negociacoes = \App\Models\Negociacao::where('vendedor_id', $userId)
            ->where('status', 'concluida')
            ->count();

        return response()->json([
            'verificado'  => true,
            'badges'      => $kyc->badges(),
            'negociacoes_concluidas' => $negociacoes,
        ]);
    }
}
